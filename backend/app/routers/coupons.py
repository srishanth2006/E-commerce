"""
routers/coupons.py
-------------------
Coupon management for promotions and discounts.
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_staff_user
from app.database import get_db

router = APIRouter(prefix="/coupons", tags=["Coupons"])


@router.get("", response_model=List[schemas.CouponOut])
def list_coupons(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_staff_user)):
    return db.query(models.Coupon).order_by(models.Coupon.created_at.desc()).all()


@router.post("", response_model=schemas.CouponOut, status_code=201)
def create_coupon(
    payload: schemas.CouponCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    if db.query(models.Coupon).filter(models.Coupon.code == payload.code.upper()).first():
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    coupon = models.Coupon(**payload.model_dump())
    coupon.code = payload.code.upper()
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.delete("/{coupon_id}", status_code=204)
def delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    db.delete(coupon)
    db.commit()


@router.post("/validate")
def validate_coupon(
    payload: schemas.CouponValidate,
    db: Session = Depends(get_db),
):
    coupon = db.query(models.Coupon).filter(
        models.Coupon.code == payload.code.upper(),
        models.Coupon.is_active == True,  # noqa: E712
    ).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    if coupon.expires_at and coupon.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Coupon has expired")
    if coupon.used_count >= coupon.max_uses:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    if payload.cart_total < coupon.min_order:
        raise HTTPException(status_code=400, detail=f"Minimum order ₹{coupon.min_order} required")
    if coupon.discount_type == "percentage":
        discount = round(payload.cart_total * coupon.discount_value / 100, 2)
    else:
        discount = min(coupon.discount_value, payload.cart_total)
    return {"code": coupon.code, "discount_type": coupon.discount_type, "discount_value": coupon.discount_value, "discount_amount": discount, "message": f"You save ₹{discount:.0f}"}
