"""
routers/storefront.py
-----------------------
MODULE 3 - CUSTOMER (self-service storefront)

Every endpoint here is scoped to the logged-in customer via
get_current_customer - a customer can only ever see/modify their OWN
cart, wishlist, addresses, orders, and reviews.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.auth import get_current_customer
from app.database import get_db

router = APIRouter(prefix="/storefront", tags=["Customer Storefront"])


# ===========================================================================
# Profile
# ===========================================================================
@router.get("/profile", response_model=schemas.CustomerOut)
def get_profile(current_customer: models.Customer = Depends(get_current_customer)):
    return current_customer


@router.put("/profile", response_model=schemas.CustomerOut)
def update_profile(
    payload: schemas.CustomerUpdate,
    db: Session = Depends(get_db),
    current_customer: models.Customer = Depends(get_current_customer),
):
    for field, value in payload.model_dump(exclude_unset=True, exclude={"loyalty_points"}).items():
        setattr(current_customer, field, value)
    db.commit()
    db.refresh(current_customer)
    return current_customer


# ===========================================================================
# Addresses
# ===========================================================================
@router.get("/addresses", response_model=List[schemas.CustomerAddressOut])
def list_addresses(
    db: Session = Depends(get_db), current_customer: models.Customer = Depends(get_current_customer)
):
    return (
        db.query(models.CustomerAddress)
        .filter(models.CustomerAddress.customer_id == current_customer.customer_id)
        .all()
    )


@router.post("/addresses", response_model=schemas.CustomerAddressOut, status_code=201)
def add_address(
    payload: schemas.CustomerAddressCreate,
    db: Session = Depends(get_db),
    current_customer: models.Customer = Depends(get_current_customer),
):
    if payload.is_default:
        db.query(models.CustomerAddress).filter(
            models.CustomerAddress.customer_id == current_customer.customer_id
        ).update({"is_default": False})

    address = models.CustomerAddress(customer_id=current_customer.customer_id, **payload.model_dump())
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.delete("/addresses/{address_id}", status_code=204)
def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_customer: models.Customer = Depends(get_current_customer),
):
    address = (
        db.query(models.CustomerAddress)
        .filter(
            models.CustomerAddress.id == address_id,
            models.CustomerAddress.customer_id == current_customer.customer_id,
        )
        .first()
    )
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    db.delete(address)
    db.commit()
    return None


# ===========================================================================
# Wishlist
# ===========================================================================
@router.get("/wishlist", response_model=List[schemas.WishlistItemOut])
def get_wishlist(
    db: Session = Depends(get_db), current_customer: models.Customer = Depends(get_current_customer)
):
    return (
        db.query(models.WishlistItem)
        .options(joinedload(models.WishlistItem.product))
        .filter(models.WishlistItem.customer_id == current_customer.customer_id)
        .all()
    )


@router.post("/wishlist/{product_id}", response_model=schemas.WishlistItemOut, status_code=201)
def add_to_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_customer: models.Customer = Depends(get_current_customer),
):
    product = db.query(models.Product).filter(models.Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = (
        db.query(models.WishlistItem)
        .filter(
            models.WishlistItem.customer_id == current_customer.customer_id,
            models.WishlistItem.product_id == product_id,
        )
        .first()
    )
    if existing:
        return existing

    item = models.WishlistItem(customer_id=current_customer.customer_id, product_id=product_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/wishlist/{product_id}", status_code=204)
def remove_from_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_customer: models.Customer = Depends(get_current_customer),
):
    db.query(models.WishlistItem).filter(
        models.WishlistItem.customer_id == current_customer.customer_id,
        models.WishlistItem.product_id == product_id,
    ).delete()
    db.commit()
    return None


# ===========================================================================
# Cart
# ===========================================================================
@router.get("/cart", response_model=List[schemas.CartItemOut])
def get_cart(db: Session = Depends(get_db), current_customer: models.Customer = Depends(get_current_customer)):
    return (
        db.query(models.CartItem)
        .options(joinedload(models.CartItem.product))
        .filter(models.CartItem.customer_id == current_customer.customer_id)
        .all()
    )


@router.post("/cart", response_model=schemas.CartItemOut, status_code=201)
def add_to_cart(
    payload: schemas.CartItemCreate,
    db: Session = Depends(get_db),
    current_customer: models.Customer = Depends(get_current_customer),
):
    product = db.query(models.Product).filter(models.Product.product_id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = (
        db.query(models.CartItem)
        .filter(
            models.CartItem.customer_id == current_customer.customer_id,
            models.CartItem.product_id == payload.product_id,
        )
        .first()
    )
    if existing:
        existing.quantity += payload.quantity
        db.commit()
        db.refresh(existing)
        return existing

    item = models.CartItem(customer_id=current_customer.customer_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/cart/{item_id}", response_model=schemas.CartItemOut)
def update_cart_item(
    item_id: int,
    payload: schemas.CartItemUpdate,
    db: Session = Depends(get_db),
    current_customer: models.Customer = Depends(get_current_customer),
):
    item = (
        db.query(models.CartItem)
        .filter(models.CartItem.id == item_id, models.CartItem.customer_id == current_customer.customer_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    item.quantity = payload.quantity
    db.commit()
    db.refresh(item)
    return item


@router.delete("/cart/{item_id}", status_code=204)
def remove_cart_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_customer: models.Customer = Depends(get_current_customer),
):
    db.query(models.CartItem).filter(
        models.CartItem.id == item_id, models.CartItem.customer_id == current_customer.customer_id
    ).delete()
    db.commit()
    return None


@router.delete("/cart", status_code=204)
def clear_cart(
    db: Session = Depends(get_db), current_customer: models.Customer = Depends(get_current_customer)
):
    db.query(models.CartItem).filter(models.CartItem.customer_id == current_customer.customer_id).delete()
    db.commit()
    return None


# ===========================================================================
# Order history
# ===========================================================================
@router.get("/orders", response_model=List[schemas.OrderOut])
def order_history(
    db: Session = Depends(get_db), current_customer: models.Customer = Depends(get_current_customer)
):
    return (
        db.query(models.Order)
        .options(joinedload(models.Order.items))
        .filter(models.Order.customer_id == current_customer.customer_id)
        .order_by(models.Order.created_at.desc())
        .all()
    )


# ===========================================================================
# Reviews & ratings
# ===========================================================================
@router.post("/reviews", response_model=schemas.ProductReviewOut, status_code=201)
def add_review(
    payload: schemas.ProductReviewCreate,
    db: Session = Depends(get_db),
    current_customer: models.Customer = Depends(get_current_customer),
):
    product = db.query(models.Product).filter(models.Product.product_id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    review = models.ProductReview(customer_id=current_customer.customer_id, **payload.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/reviews/{product_id}", response_model=List[schemas.ProductReviewOut])
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    """Public - anyone can read reviews for a product (no login needed)."""
    return (
        db.query(models.ProductReview)
        .options(joinedload(models.ProductReview.customer))
        .filter(models.ProductReview.product_id == product_id)
        .order_by(models.ProductReview.created_at.desc())
        .all()
    )
