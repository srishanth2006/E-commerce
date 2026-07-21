"""
routers/inventory.py
---------------------
MODULE 7 - INVENTORY MANAGEMENT
MODULE 8 - LOW STOCK ALERT

Stock-focused endpoints that sit "on top of" products:
  - GET  /inventory                current stock levels for every product
  - GET  /inventory/logs           full inventory history (optionally per product)
  - POST /inventory/{product_id}/adjust   manual stock update form (also
    fires a low-stock notification + email if the new level is at/under
    the reorder level - Module 8. The frontend plays a sound alert and
    shows a red badge based on the same threshold - see Inventory.jsx)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.auth import get_current_staff_user
from app.database import get_db
from app.utils.email import send_email
from app.routers.websocket import broadcast_sync

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("", response_model=List[schemas.ProductOut])
def stock_levels(db: Session = Depends(get_db)):
    return (
        db.query(models.Product)
        .options(joinedload(models.Product.category))
        .order_by(models.Product.stock_quantity.asc())
        .all()
    )


@router.get("/logs", response_model=List[schemas.InventoryLogOut])
def inventory_history(
    product_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(models.InventoryLog).options(joinedload(models.InventoryLog.product))
    if product_id:
        query = query.filter(models.InventoryLog.product_id == product_id)
    return query.order_by(models.InventoryLog.created_at.desc()).limit(200).all()


@router.post("/{product_id}/adjust", response_model=schemas.ProductOut)
def adjust_stock(
    product_id: int,
    payload: schemas.StockUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    product = db.query(models.Product).filter(models.Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_stock = product.stock_quantity + payload.quantity_change
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot go below zero")

    product.stock_quantity = new_stock
    db.add(models.InventoryLog(
        product_id=product.product_id,
        change_type=payload.change_type,
        quantity_change=payload.quantity_change,
        stock_after=new_stock,
        note=payload.note,
    ))
    db.commit()
    db.refresh(product)

    # MODULE 8: low stock alert (dashboard notification + email). Only
    # fires once per crossing (i.e. we don't spam a notification on every
    # single adjustment while stock stays low) by checking whether this
    # particular change is what pushed it at/under the threshold.
    if product.stock_quantity <= product.reorder_level:
        notif = models.Notification(
            type="low_stock",
            title=f"Low stock: {product.name}",
            message=f"{product.name} is down to {product.stock_quantity} {product.unit} "
            f"(reorder level: {product.reorder_level}).",
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        broadcast_sync({
            "type": "notification",
            "data": {"id": notif.id, "type": notif.type, "title": notif.title, "message": notif.message, "is_read": False, "created_at": str(notif.created_at)},
        })

        admins = db.query(models.User).filter(models.User.role == "admin", models.User.is_active == True).all()  # noqa: E712
        for admin in admins:
            send_email(
                admin.email,
                f"Low stock alert: {product.name}",
                f"{product.name} is down to {product.stock_quantity} {product.unit}, "
                f"at or below the reorder level of {product.reorder_level}. Please restock soon.",
            )

    return product
