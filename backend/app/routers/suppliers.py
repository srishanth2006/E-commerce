"""routers/suppliers.py - CRUD for suppliers, plus purchase history (Module 4)."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.auth import get_current_staff_user, require_role
from app.database import get_db

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("", response_model=List[schemas.SupplierOut])
def list_suppliers(search: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(models.Supplier)
    if search:
        query = query.filter(models.Supplier.supplier_name.ilike(f"%{search}%"))
    return query.order_by(models.Supplier.supplier_name).all()


@router.get("/{supplier_id}", response_model=schemas.SupplierOut)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(models.Supplier).filter(models.Supplier.supplier_id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.post("", response_model=schemas.SupplierOut, status_code=201)
def create_supplier(
    payload: schemas.SupplierCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    supplier = models.Supplier(**payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.put("/{supplier_id}", response_model=schemas.SupplierOut)
def update_supplier(
    supplier_id: int,
    payload: schemas.SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    supplier = db.query(models.Supplier).filter(models.Supplier.supplier_id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    supplier = db.query(models.Supplier).filter(models.Supplier.supplier_id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.delete(supplier)
    db.commit()
    return None


@router.get("/{supplier_id}/purchase-history", response_model=List[schemas.PurchaseBillOut])
def supplier_purchase_history(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    """MODULE 4 - every restock bill ever recorded for this supplier
    (manual entries and AI/OCR-scanned invoices alike)."""
    supplier = db.query(models.Supplier).filter(models.Supplier.supplier_id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    return (
        db.query(models.PurchaseBill)
        .options(joinedload(models.PurchaseBill.items).joinedload(models.PurchaseBillItem.product))
        .filter(models.PurchaseBill.supplier_id == supplier_id)
        .order_by(models.PurchaseBill.created_at.desc())
        .all()
    )
