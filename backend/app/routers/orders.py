"""
routers/orders.py
------------------
Order management for the customer storefront.
Handles order placement with status lifecycle, coupon validation,
waiting time estimation, and order status updates.
"""
from datetime import datetime, timedelta
from typing import List
import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app import models, schemas
from app.auth import get_current_customer, get_current_staff_user
from app.database import get_db

router = APIRouter(prefix="/orders", tags=["Orders"])


def _generate_order_uid(db: Session) -> str:
    for _ in range(20):
        uid = f"{random.randint(1000, 9999)}"
        if not db.query(models.Order).filter(models.Order.order_uid == uid).first():
            return uid
    raise HTTPException(status_code=500, detail="Could not generate unique order ID")


def _estimate_minutes(item_count: int, pending_orders: int) -> int:
    """Estimate preparation time based on cart size and pending orders."""
    base = max(5, item_count * 2)
    queue = pending_orders * 3
    return base + queue


@router.post("", response_model=schemas.OrderOut, status_code=201)
def place_order(
    payload: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.Customer = Depends(get_current_customer),
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    # --- ANTI-ABUSE: Check if customer is flagged ---
    if current_user.is_flagged:
        raise HTTPException(
            status_code=403,
            detail=f"Your account is restricted. Reason: {current_user.flag_reason or 'Abuse detected'}. Please contact the store.",
        )

    # --- ANTI-ABUSE: Rate limit — max 5 orders per hour per customer ---
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_orders = db.query(models.Order).filter(
        models.Order.customer_id == current_user.customer_id,
        models.Order.created_at >= one_hour_ago,
    ).count()
    if recent_orders >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many orders. You can place a maximum of 5 orders per hour. Please try again later.",
        )

    subtotal = 0.0
    order_items = []
    for item in payload.items:
        product = db.query(models.Product).filter(
            models.Product.product_id == item.product_id,
            models.Product.is_active == True  # noqa: E712
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.stock_quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")
        # MRP enforcement: selling price cannot exceed MRP
        if product.mrp and product.mrp > 0 and item.unit_price > product.mrp:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot sell '{product.name}' above MRP. "
                       f"Selling price ₹{item.unit_price} exceeds MRP ₹{product.mrp}",
            )

        total = item.unit_price * item.quantity
        subtotal += total
        order_items.append({
            "product_id": product.product_id,
            "product_name": product.name,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": round(total, 2),
        })

    discount = 0.0
    if payload.coupon_code:
        coupon = db.query(models.Coupon).filter(
            models.Coupon.code == payload.coupon_code.upper(),
            models.Coupon.is_active == True,  # noqa: E712
        ).first()
        if not coupon:
            raise HTTPException(status_code=400, detail="Invalid coupon code")
        if coupon.expires_at and coupon.expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Coupon has expired")
        if coupon.used_count >= coupon.max_uses:
            raise HTTPException(status_code=400, detail="Coupon usage limit reached")
        if subtotal < coupon.min_order:
            raise HTTPException(status_code=400, detail=f"Minimum order ₹{coupon.min_order} required")
        if coupon.discount_type == "percentage":
            discount = round(subtotal * coupon.discount_value / 100, 2)
        else:
            discount = min(coupon.discount_value, subtotal)
        coupon.used_count += 1

    net = subtotal - discount
    if payload.fulfillment == "delivery":
        if net >= 500:
            delivery_fee = 0.0
        elif net >= 200:
            delivery_fee = 20.0
        else:
            delivery_fee = 40.0
    else:
        delivery_fee = 0.0
    grand_total = round(subtotal - discount + delivery_fee, 2)

    pending = db.query(models.Order).filter(
        models.Order.status.in_(["placed", "confirmed", "packed"])
    ).count()
    est = _estimate_minutes(len(payload.items), pending)

    order = models.Order(
        customer_id=current_user.customer_id,
        order_uid=_generate_order_uid(db),
        status="placed",
        fulfillment=payload.fulfillment,
        subtotal=round(subtotal, 2),
        discount=discount,
        delivery_fee=delivery_fee,
        grand_total=grand_total,
        payment_method=payload.payment_method,
        payment_status="pending" if payload.payment_method in ("cod", "upi") else "paid",
        delivery_address=payload.delivery_address,
        phone=payload.phone,
        notes=payload.notes,
        estimated_minutes=est,
    )
    db.add(order)
    db.flush()

    for oi in order_items:
        db.add(models.OrderItem(order_id=order.id, **oi))
        product = db.query(models.Product).filter(models.Product.product_id == oi["product_id"]).first()
        if product:
            product.stock_quantity -= oi["quantity"]
            db.add(models.InventoryLog(
                product_id=product.product_id,
                change_type="sale",
                quantity_change=-oi["quantity"],
                stock_after=product.stock_quantity,
                note=f"Order #{order.id}",
            ))

    db.query(models.CartItem).filter(models.CartItem.customer_id == current_user.customer_id).delete()

    current_user.loyalty_points = (current_user.loyalty_points or 0) + int(grand_total // 100)

    db.add(models.Notification(
        type="order_success",
        title="New order received",
        message=f"Order #{order.id}: {len(payload.items)} item(s), total ₹{grand_total:.2f} ({payload.fulfillment})",
    ))
    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=List[schemas.OrderOut])
def my_orders(
    db: Session = Depends(get_db),
    current_user: models.Customer = Depends(get_current_customer),
):
    return (
        db.query(models.Order)
        .options(joinedload(models.Order.items))
        .filter(models.Order.customer_id == current_user.customer_id)
        .order_by(models.Order.created_at.desc())
        .all()
    )


@router.get("/all", response_model=List[schemas.OrderOut])
def all_orders(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    q = db.query(models.Order).options(
        joinedload(models.Order.items),
        joinedload(models.Order.customer),
    )
    if status:
        q = q.filter(models.Order.status == status)
    return q.order_by(models.Order.created_at.desc()).all()


@router.put("/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(
    order_id: int,
    payload: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    valid = ["placed", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"]
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")
    order.status = payload.status
    order.updated_at = datetime.utcnow()
    db.add(models.Notification(
        type="order_success",
        title=f"Order #{order.id} updated",
        message=f"Status changed to: {payload.status}",
    ))
    db.commit()
    db.refresh(order)
    return order


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_customer),
):
    order = (
        db.query(models.Order)
        .options(joinedload(models.Order.items))
        .filter(models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/{order_id}/cancel", response_model=schemas.OrderOut)
def cancel_order(
    order_id: int,
    payload: schemas.OrderCancelRequest = schemas.OrderCancelRequest(),
    db: Session = Depends(get_db),
    current_user: models.Customer = Depends(get_current_customer),
):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.customer_id == current_user.customer_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ["placed", "confirmed"]:
        raise HTTPException(status_code=400, detail="Cannot cancel order in current status")

    # --- ANTI-ABUSE: Check if customer is flagged ---
    if current_user.is_flagged:
        raise HTTPException(
            status_code=403,
            detail=f"Your account is restricted. Reason: {current_user.flag_reason or 'Abuse detected'}. Please contact the store.",
        )

    # --- ANTI-ABUSE: Check customer cancellation count today ---
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    cancelled_today = db.query(models.Order).filter(
        models.Order.customer_id == current_user.customer_id,
        models.Order.status == "cancelled",
        models.Order.updated_at >= today_start,
    ).count()
    if cancelled_today >= 3:
        raise HTTPException(
            status_code=429,
            detail="Cancellation limit reached. You can cancel a maximum of 3 orders per day. Please contact the store for help.",
        )

    # --- ANTI-ABUSE: Auto-flag if total cancellations >= 5 ---
    total_cancellations = db.query(models.Order).filter(
        models.Order.customer_id == current_user.customer_id,
        models.Order.status == "cancelled",
    ).count()
    if total_cancellations >= 5:
        current_user.is_flagged = True
        current_user.flag_reason = "Excessive order cancellations"
        db.flush()

    # --- ANTI-ABUSE: Time limit — "placed" orders must be cancelled within 30 min ---
    if order.status == "placed":
        age_minutes = (datetime.utcnow() - (order.created_at or datetime.utcnow())).total_seconds() / 60
        if age_minutes > 30:
            raise HTTPException(
                status_code=400,
                detail="This order is too old to cancel. Orders can only be cancelled within 30 minutes of placement. Please contact the store for help.",
            )

    # --- ANTI-ABUSE: "confirmed" orders can only be cancelled before packing ---
    if order.status == "confirmed":
        age_minutes = (datetime.utcnow() - (order.updated_at or order.created_at or datetime.utcnow())).total_seconds() / 60
        if age_minutes > 60:
            raise HTTPException(
                status_code=400,
                detail="This order is already being prepared. Please contact the store for any changes.",
            )

    was_confirmed = order.status == "confirmed"
    order.status = "cancelled"
    order.refund_status = "pending"
    order.refund_details = payload.refund_details.strip() or None
    if was_confirmed and order.delivery_fee and order.delivery_fee > 0:
        order.refund_amount = round(order.grand_total - order.delivery_fee / 2, 2)
    else:
        order.refund_amount = order.grand_total
    for item in order.items:
        product = db.query(models.Product).filter(models.Product.product_id == item.product_id).first()
        if product:
            product.stock_quantity += item.quantity
            db.add(models.InventoryLog(
                product_id=product.product_id,
                change_type="return",
                quantity_change=item.quantity,
                stock_after=product.stock_quantity,
                note=f"Order #{order.id} cancelled",
            ))
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/confirm-payment", response_model=schemas.OrderOut)
def confirm_upi_payment(
    order_id: int,
    utr_number: str = "",
    db: Session = Depends(get_db),
    current_user: models.Customer = Depends(get_current_customer),
):
    """Customer confirms they have completed UPI payment by providing UTR number."""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.customer_id == current_user.customer_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_method != "upi":
        raise HTTPException(status_code=400, detail="This order is not a UPI payment")
    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Payment already confirmed")
    if not utr_number or len(utr_number.strip()) < 6:
        raise HTTPException(status_code=400, detail="Please enter a valid UTR number (found in your UPI app after payment)")
    order.payment_status = "paid"
    order.utr_number = utr_number.strip()
    order.updated_at = datetime.utcnow()
    db.add(models.Notification(
        type="order_success",
        title=f"Payment confirmed for Order #{order.id}",
        message=f"UTR: {utr_number.strip()} — ₹{order.grand_total:.2f}",
    ))
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/admin-confirm-payment", response_model=schemas.OrderOut)
def admin_confirm_payment(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    """Admin verifies UTR and confirms payment received."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Payment already confirmed")
    order.payment_status = "paid"
    order.updated_at = datetime.utcnow()
    db.add(models.Notification(
        type="order_success",
        title=f"Payment confirmed for Order #{order.id}",
        message=f"Admin verified UTR {order.utr_number or 'N/A'} — ₹{order.grand_total:.2f} ({order.payment_method})",
    ))
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/confirm-refund", response_model=schemas.OrderOut)
def confirm_refund(
    order_id: int,
    refund_utr: str = "",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    """Admin confirms that refund has been processed to customer."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "cancelled":
        raise HTTPException(status_code=400, detail="Order is not cancelled")
    if order.refund_status == "completed":
        raise HTTPException(status_code=400, detail="Refund already confirmed")
    order.refund_status = "completed"
    order.refund_utr = refund_utr.strip() or None
    order.refund_date = datetime.utcnow()
    order.updated_at = datetime.utcnow()
    db.add(models.Notification(
        type="order_success",
        title=f"Refund confirmed for Order #{order.id}",
        message=f"₹{order.refund_amount:.2f} refund completed (UTR: {refund_utr.strip() or 'N/A'}) for Order #{order.id}",
    ))
    db.commit()
    db.refresh(order)
    return order
