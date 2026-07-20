"""
routers/products.py
--------------------
MODULE 2 - PRODUCT MANAGEMENT

Full CRUD for products, plus:
  - search + filters (category, brand, price range, low stock, expiry)
  - barcode lookup (fast POS scanning)
  - multiple image upload (Module 2), primary image upload
  - barcode / QR code image generation (Module 15)
"""

import os
import uuid
from typing import List, Optional
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.auth import get_current_staff_user, require_role
from app.database import get_db

router = APIRouter(prefix="/products", tags=["Products"])

UPLOAD_DIR = "uploads/products"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _save_upload(file: UploadFile) -> str:
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(file.file.read())
    return f"/{filepath}"


@router.get("", response_model=List[schemas.ProductOut])
def list_products(
    search: Optional[str] = Query(None, description="Search by product name"),
    category_id: Optional[int] = Query(None),
    brand_id: Optional[int] = Query(None),
    supplier_id: Optional[int] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    low_stock_only: bool = Query(False),
    expiring_soon_days: Optional[int] = Query(None, description="Only items expiring within N days"),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Product).options(
        joinedload(models.Product.category),
        joinedload(models.Product.brand),
        joinedload(models.Product.images),
    )

    if search:
        query = query.filter(models.Product.name.ilike(f"%{search}%"))
    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    if brand_id:
        query = query.filter(models.Product.brand_id == brand_id)
    if supplier_id:
        query = query.filter(models.Product.supplier_id == supplier_id)
    if min_price is not None:
        query = query.filter(models.Product.selling_price >= min_price)
    if max_price is not None:
        query = query.filter(models.Product.selling_price <= max_price)
    if low_stock_only:
        query = query.filter(models.Product.stock_quantity <= models.Product.reorder_level)
    if expiring_soon_days is not None:
        cutoff = date.today() + timedelta(days=expiring_soon_days)
        query = query.filter(models.Product.expiry_date.isnot(None), models.Product.expiry_date <= cutoff)
    if is_active is not None:
        query = query.filter(models.Product.is_active == is_active)

    return query.order_by(models.Product.name).all()


@router.get("/barcode/{barcode}", response_model=schemas.ProductOut)
def get_product_by_barcode(barcode: str, db: Session = Depends(get_db)):
    """Used by the POS barcode scanner (Module 15) for fast add-to-cart."""
    product = (
        db.query(models.Product)
        .options(joinedload(models.Product.category))
        .filter(models.Product.barcode == barcode)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="No product found with this barcode")
    return product


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(models.Product)
        .options(
            joinedload(models.Product.category),
            joinedload(models.Product.brand),
            joinedload(models.Product.images),
        )
        .filter(models.Product.product_id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=schemas.ProductOut, status_code=201)
def create_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    if payload.barcode:
        existing = db.query(models.Product).filter(models.Product.barcode == payload.barcode).first()
        if existing:
            raise HTTPException(status_code=400, detail="A product with this barcode already exists")

    data = payload.model_dump()
    # Selling price = MRP always; if no MRP, calculate from margin
    if payload.mrp and payload.mrp > 0:
        data["selling_price"] = payload.mrp
    elif payload.purchase_price and payload.profit_margin_percent:
        data["selling_price"] = round(payload.purchase_price * (1 + payload.profit_margin_percent / 100), 2)

    product = models.Product(**data)
    db.add(product)
    db.commit()
    db.refresh(product)

    if product.stock_quantity:
        db.add(models.InventoryLog(
            product_id=product.product_id,
            change_type="restock",
            quantity_change=product.stock_quantity,
            stock_after=product.stock_quantity,
            note="Opening stock on product creation",
        ))
        db.commit()

    return product


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    product = db.query(models.Product).filter(models.Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    data = payload.model_dump(exclude_unset=True)
    old_stock = product.stock_quantity

    # Selling price = MRP always; if no MRP, calculate from margin
    new_mrp = data.get("mrp", product.mrp)
    new_purchase = data.get("purchase_price", product.purchase_price)
    new_margin = data.get("profit_margin_percent", product.profit_margin_percent)
    if "mrp" in data or "purchase_price" in data or "profit_margin_percent" in data:
        if new_mrp and new_mrp > 0:
            data["selling_price"] = new_mrp
        else:
            data["selling_price"] = round(new_purchase * (1 + new_margin / 100), 2)

    for field, value in data.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)

    if "stock_quantity" in data and data["stock_quantity"] != old_stock:
        db.add(models.InventoryLog(
            product_id=product.product_id,
            change_type="adjustment",
            quantity_change=data["stock_quantity"] - old_stock,
            stock_after=product.stock_quantity,
            note="Manual edit via product form",
        ))
        db.commit()

    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    product = db.query(models.Product).filter(models.Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return None


@router.post("/{product_id}/image", response_model=schemas.ProductOut)
def upload_primary_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    product = db.query(models.Product).filter(models.Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.image_url = _save_upload(file)
    db.commit()
    db.refresh(product)
    return product


@router.post("/{product_id}/images", response_model=schemas.ProductOut)
def upload_additional_images(
    product_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    """Module 2: multiple product images. The first upload ever made also
    becomes the primary image if one isn't set yet."""
    product = db.query(models.Product).filter(models.Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for file in files:
        url = _save_upload(file)
        db.add(models.ProductImage(product_id=product.product_id, image_url=url))
        if not product.image_url:
            product.image_url = url

    db.commit()
    db.refresh(product)
    return product


@router.delete("/images/{image_id}", status_code=204)
def delete_product_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    image = db.query(models.ProductImage).filter(models.ProductImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    db.delete(image)
    db.commit()
    return None


@router.get("/{product_id}/barcode-image")
def generate_barcode_image(product_id: int, db: Session = Depends(get_db)):
    """
    MODULE 15 - Generates a scannable Code128 barcode PNG for this product.
    Requires the `python-barcode` and `Pillow` packages (see requirements.txt).
    """
    product = db.query(models.Product).filter(models.Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not product.barcode:
        raise HTTPException(status_code=400, detail="This product has no barcode value set yet")

    try:
        import barcode
        from barcode.writer import ImageWriter
        import io

        buffer = io.BytesIO()
        code128 = barcode.get("code128", product.barcode, writer=ImageWriter())
        code128.write(buffer)
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="image/png")
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="Barcode generation requires 'python-barcode' and 'Pillow'. "
            "Install with: pip install python-barcode Pillow",
        )


@router.get("/{product_id}/qrcode-image")
def generate_qr_code_image(product_id: int, db: Session = Depends(get_db)):
    """MODULE 15 - Generates a QR code PNG encoding this product's id + name.
    Requires the `qrcode` and `Pillow` packages."""
    product = db.query(models.Product).filter(models.Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        import qrcode
        import io

        qr_data = f"PRODUCT:{product.product_id}:{product.name}"
        img = qrcode.make(qr_data)
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="image/png")
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="QR code generation requires 'qrcode' and 'Pillow'. "
            "Install with: pip install qrcode Pillow",
        )
