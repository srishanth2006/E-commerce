"""
routers/purchases.py
----------------------
MODULE 5 - SMART PURCHASE BILL SCANNER (AI)
MODULE 6 - AI PRODUCT MATCHING

Flow:
  1. POST /purchases/scan-invoice   - admin uploads PDF/image, we OCR it,
     parse it into candidate line items, and AI-match each item against
     the existing catalog (Module 6). Nothing is saved to the DB yet -
     this just returns a review payload for the admin to check/edit.
  2. POST /purchases                - admin submits the (possibly edited)
     line items. THIS is what actually creates/updates products, bumps
     stock, and logs the inventory change. Existing products get stock
     added (Water Bottle 20 -> +100 invoice qty -> 120) and their
     purchase_price updated if it changed; unmatched items create a new
     product. If profit_margin_percent is given, selling_price is
     auto-calculated from purchase_price.
  3. GET /purchases, GET /purchases/{id} - browse purchase history.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.auth import get_current_staff_user
from app.database import get_db
from app.utils import ocr as ocr_utils
from app.utils.ai_matching import find_best_match, AUTO_MATCH_THRESHOLD
from app.utils.email import send_email
from app.config import settings

router = APIRouter(prefix="/purchases", tags=["Purchases (AI Invoice Scanner)"])


@router.post("/scan-invoice", response_model=schemas.OCRScanResult)
async def scan_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    """MODULE 5 - Upload a PDF/image invoice; get back OCR-extracted,
    AI-matched line items for the admin to review before committing."""
    file_bytes = await file.read()

    raw_text = ""
    ocr_failed = False
    try:
        raw_text = ocr_utils.extract_text(file_bytes, file.filename)
    except ocr_utils.OCRNotAvailable:
        ocr_failed = True
    except Exception:
        ocr_failed = True

    parsed = ocr_utils.parse_invoice_text(raw_text) if raw_text else {
        "supplier_name": None, "invoice_number": None,
        "invoice_date": None, "gst_number": None, "line_items": [],
    }

    db.add(models.Notification(
        type="invoice_uploaded",
        title="Invoice uploaded",
        message=f"'{file.filename}' uploaded - {len(parsed['line_items'])} item(s) detected. Review before committing.",
    ))
    db.commit()

    warnings = []
    if ocr_failed:
        warnings.append(
            "OCR engine failed to process this file. You can still add items manually below."
        )
    if not parsed["line_items"]:
        warnings.append(
            "No line items could be automatically detected. You can add items manually below."
        )
    if not parsed["gst_number"]:
        warnings.append("GST number not detected - please enter it manually if needed.")

    matched_supplier_id = None
    supplier_created = False
    if parsed["supplier_name"]:
        supplier = (
            db.query(models.Supplier)
            .filter(models.Supplier.supplier_name.ilike(f"%{parsed['supplier_name']}%"))
            .first()
        )
        if supplier:
            matched_supplier_id = supplier.supplier_id
        else:
            # Auto-create supplier from OCR-detected name
            supplier = models.Supplier(
                supplier_name=parsed["supplier_name"],
                gst_number=parsed.get("gst_number"),
            )
            db.add(supplier)
            db.flush()
            matched_supplier_id = supplier.supplier_id
            supplier_created = True
            warnings.append(
                f"New supplier '{parsed['supplier_name']}' was auto-created. "
                "You can edit their details later in Suppliers page."
            )

    all_products = db.query(models.Product).filter(models.Product.is_active == True).all()  # noqa: E712
    extracted_items = []
    for item in parsed["line_items"]:
        best_product, confidence = find_best_match(item["name"], db, candidates=all_products)
        extracted_items.append(
            schemas.OCRExtractedItem(
                matched_name=item["name"],
                quantity=item["quantity"],
                purchase_price=item["price"],
                suggested_selling_price=None,
                matched_product_id=best_product.product_id if (best_product and confidence >= AUTO_MATCH_THRESHOLD) else None,
                matched_product_name=best_product.name if best_product else None,
                match_confidence=confidence,
                is_new_product=confidence < AUTO_MATCH_THRESHOLD,
            )
        )

    return schemas.OCRScanResult(
        supplier_name=parsed["supplier_name"],
        matched_supplier_id=matched_supplier_id,
        invoice_number=parsed["invoice_number"],
        invoice_date=parsed["invoice_date"],
        gst_number=parsed["gst_number"],
        items=extracted_items,
        raw_text=raw_text or None,
        warnings=warnings,
    )


@router.post("", response_model=schemas.PurchaseBillOut, status_code=201)
def commit_purchase_bill(
    payload: schemas.PurchaseBillCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    """Creates the purchase bill AND applies every line item to inventory:
    existing products get stock added (+ purchase_price updated if changed),
    unmatched items become brand-new products."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="A purchase bill must include at least one item")

    bill = models.PurchaseBill(
        supplier_id=payload.supplier_id,
        invoice_number=payload.invoice_number,
        invoice_date=payload.invoice_date,
        gst_number=payload.gst_number,
        source=payload.source,
        raw_ocr_text=payload.raw_ocr_text,
        created_by=current_user.user_id,
    )
    db.add(bill)
    db.flush()

    total_amount = 0.0

    for item in payload.items:
        product = None
        if item.product_id:
            product = db.query(models.Product).filter(models.Product.product_id == item.product_id).first()

        if product:
            # ---- Existing product: bump stock, update purchase price if changed ----
            old_stock = product.stock_quantity
            product.stock_quantity = old_stock + item.quantity
            price_changed = item.purchase_price and item.purchase_price != product.purchase_price
            if price_changed:
                product.purchase_price = item.purchase_price
            # Selling price = MRP always
            if product.mrp and product.mrp > 0:
                product.selling_price = product.mrp
            elif payload.profit_margin_percent:
                product.selling_price = round(
                    product.purchase_price * (1 + payload.profit_margin_percent / 100), 2
                )
            if item.expiry_date:
                product.expiry_date = item.expiry_date
            if item.batch_number:
                product.batch_number = item.batch_number

            db.add(models.InventoryLog(
                product_id=product.product_id,
                change_type="restock",
                quantity_change=item.quantity,
                stock_after=product.stock_quantity,
                note=f"Purchase bill #{bill.id}" + (" (price updated)" if price_changed else ""),
            ))
            is_new = False
        else:
            # ---- Not matched: auto-create a new product ----
            selling_price = round(item.purchase_price * (1 + (payload.profit_margin_percent or 15) / 100), 2)
            if item.mrp and item.mrp > 0:
                selling_price = item.mrp

            product = models.Product(
                name=item.matched_name,
                category_id=item.category_id,
                supplier_id=payload.supplier_id,
                purchase_price=item.purchase_price,
                selling_price=selling_price,
                mrp=item.mrp,
                profit_margin_percent=payload.profit_margin_percent or 15,
                stock_quantity=item.quantity,
                unit=item.unit or "pcs",
                expiry_date=item.expiry_date,
                batch_number=item.batch_number,
                gst_percent=item.gst_percent or 5,
                discount_percent=item.discount_percent or 0,
            )
            db.add(product)
            db.flush()

            db.add(models.InventoryLog(
                product_id=product.product_id,
                change_type="restock",
                quantity_change=item.quantity,
                stock_after=item.quantity,
                note=f"New product auto-created from purchase bill #{bill.id}",
            ))
            is_new = True

        total_amount += item.quantity * item.purchase_price

        db.add(models.PurchaseBillItem(
            bill_id=bill.id,
            product_id=product.product_id,
            matched_name=item.matched_name,
            quantity=item.quantity,
            purchase_price=item.purchase_price,
            selling_price=product.selling_price,
            discount_percent=item.discount_percent,
            gst_percent=item.gst_percent,
            expiry_date=item.expiry_date,
            batch_number=item.batch_number,
            is_new_product=is_new,
        ))

    bill.total_amount = round(total_amount, 2)
    db.commit()
    db.refresh(bill)

    # MODULE 19: notification + email on successful purchase
    db.add(models.Notification(
        type="purchase_success",
        title="Purchase bill recorded",
        message=f"Invoice {bill.invoice_number or bill.id}: {len(payload.items)} item(s), "
        f"total \u20b9{bill.total_amount:.2f}",
    ))
    db.commit()

    return (
        db.query(models.PurchaseBill)
        .options(joinedload(models.PurchaseBill.items).joinedload(models.PurchaseBillItem.product))
        .filter(models.PurchaseBill.id == bill.id)
        .first()
    )


@router.get("", response_model=List[schemas.PurchaseBillOut])
def list_purchase_bills(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_staff_user)):
    return (
        db.query(models.PurchaseBill)
        .options(joinedload(models.PurchaseBill.items).joinedload(models.PurchaseBillItem.product))
        .order_by(models.PurchaseBill.created_at.desc())
        .all()
    )


@router.get("/{bill_id}", response_model=schemas.PurchaseBillOut)
def get_purchase_bill(bill_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_staff_user)):
    bill = (
        db.query(models.PurchaseBill)
        .options(joinedload(models.PurchaseBill.items).joinedload(models.PurchaseBillItem.product))
        .filter(models.PurchaseBill.id == bill_id)
        .first()
    )
    if not bill:
        raise HTTPException(status_code=404, detail="Purchase bill not found")
    return bill
