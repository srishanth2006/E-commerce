"""
routers/brands.py
------------------
MODULE 2 - PRODUCT MANAGEMENT (brand support)
Simple CRUD for product brands, same pattern as categories.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_staff_user, require_role
from app.database import get_db

router = APIRouter(prefix="/brands", tags=["Brands"])


@router.get("", response_model=List[schemas.BrandOut])
def list_brands(db: Session = Depends(get_db)):
    return db.query(models.Brand).order_by(models.Brand.name).all()


@router.post("", response_model=schemas.BrandOut, status_code=201)
def create_brand(
    payload: schemas.BrandCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    if db.query(models.Brand).filter(models.Brand.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Brand already exists")
    brand = models.Brand(**payload.model_dump())
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


@router.delete("/{brand_id}", status_code=204)
def delete_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    brand = db.query(models.Brand).filter(models.Brand.brand_id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    db.delete(brand)
    db.commit()
    return None
