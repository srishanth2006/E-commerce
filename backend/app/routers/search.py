"""
routers/search.py
--------------------
MODULE 14 - SEARCH

Global search across products, customers, and suppliers in one call
(handy for a top-navbar search box). Category/brand/price filters
already live on GET /products (search, category_id, brand_id, min_price,
max_price params) - this endpoint is specifically for the "search
everything" use case. Voice search is a frontend-only concern (uses the
browser's built-in Web Speech API to convert speech to text, then calls
this same endpoint) - no backend work needed for that part.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_staff_user
from app.database import get_db

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/global")
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    """Public - powers the storefront search bar too, so no auth required."""
    like = f"%{q}%"
    products = (
        db.query(models.Product)
        .filter(models.Product.name.ilike(like), models.Product.is_active == True)  # noqa: E712
        .limit(10)
        .all()
    )
    return {
        "products": [schemas.ProductOut.model_validate(p) for p in products],
    }


@router.get("/admin", dependencies=[Depends(get_current_staff_user)])
def admin_search(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """Staff-only: also searches customers and suppliers."""
    like = f"%{q}%"
    products = db.query(models.Product).filter(models.Product.name.ilike(like)).limit(10).all()
    customers = (
        db.query(models.Customer)
        .filter((models.Customer.name.ilike(like)) | (models.Customer.phone.ilike(like)))
        .limit(10)
        .all()
    )
    suppliers = (
        db.query(models.Supplier).filter(models.Supplier.supplier_name.ilike(like)).limit(10).all()
    )
    return {
        "products": [schemas.ProductOut.model_validate(p) for p in products],
        "customers": [schemas.CustomerOut.model_validate(c) for c in customers],
        "suppliers": [schemas.SupplierOut.model_validate(s) for s in suppliers],
    }
