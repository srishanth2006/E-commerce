"""
routers/sales.py
-----------------
Handles the POS / billing workflow.

POST /sales creates the invoice header (Sale) + line items (SaleItem)
in a single DB transaction, decrements product stock, and writes an
InventoryLog entry for every item sold - all inside one commit so the
data never ends up half-written.
"""

from datetime import datetime, date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.auth import get_current_staff_user, require_role
from app.database import get_db
from app.utils.email import send_email

router = APIRouter(prefix="/sales", tags=["Sales"])


@router.get("", response_model=List[schemas.SaleOut])
def list_sales(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Sale).options(
        joinedload(models.Sale.items).joinedload(models.SaleItem.product),
        joinedload(models.Sale.customer),
    )
    if start_date:
        query = query.filter(models.Sale.sale_date >= start_date)
    if end_date:
        query = query.filter(models.Sale.sale_date < end_date + timedelta(days=1))

    return query.order_by(models.Sale.sale_date.desc()).all()


@router.get("/{sale_id}", response_model=schemas.SaleOut)
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = (
        db.query(models.Sale)
        .options(
            joinedload(models.Sale.items).joinedload(models.SaleItem.product),
            joinedload(models.Sale.customer),
        )
        .filter(models.Sale.sale_id == sale_id)
        .first()
    )
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale


@router.post("", response_model=schemas.SaleOut, status_code=201)
def create_sale(
    payload: schemas.SaleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="A sale must have at least one item")

    subtotal = 0.0
    line_items = []

    # 1) Validate stock availability & build line items first
    for item in payload.items:
        product = db.query(models.Product).filter(
            models.Product.product_id == item.product_id
        ).with_for_update().first()

        if not product:
            raise HTTPException(status_code=404, detail=f"Product id {item.product_id} not found")
        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}' "
                       f"(available: {product.stock_quantity}, requested: {item.quantity})",
            )
        # MRP enforcement: selling price cannot exceed MRP
        if product.mrp and product.mrp > 0 and item.unit_price > product.mrp:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot sell '{product.name}' above MRP. "
                       f"Selling price ₹{item.unit_price} exceeds MRP ₹{product.mrp}",
            )

        line_total = round(item.unit_price * item.quantity, 2)
        subtotal += line_total
        line_items.append((product, item, line_total))

    discount = min(payload.discount, subtotal)  # discount can't exceed subtotal
    taxable_amount = subtotal - discount
    gst_amount = round(taxable_amount * (payload.gst_percent / 100), 2)
    grand_total = round(taxable_amount + gst_amount, 2)

    payment_status = "paid" if payload.payment_method != "cod" else "pending"

    sale = models.Sale(
        customer_id=payload.customer_id,
        user_id=current_user.user_id,
        subtotal=round(subtotal, 2),
        discount=round(discount, 2),
        gst_amount=gst_amount,
        grand_total=grand_total,
        payment_method=payload.payment_method,
        payment_status=payment_status,
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        sale_date=datetime.utcnow(),
    )
    db.add(sale)
    db.flush()  # get sale.sale_id before commit

    # 2) Create sale items, decrement stock, write inventory logs
    for product, item, line_total in line_items:
        db.add(models.SaleItem(
            sale_id=sale.sale_id,
            product_id=product.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=line_total,
        ))
        product.stock_quantity -= item.quantity
        db.add(models.InventoryLog(
            product_id=product.product_id,
            change_type="sale",
            quantity_change=-item.quantity,
            stock_after=product.stock_quantity,
            note=f"Sold in invoice #{sale.sale_id}",
        ))

    # 3) Reward loyalty points: 1 point per 100 currency units spent
    if payload.customer_id:
        customer = db.query(models.Customer).filter(
            models.Customer.customer_id == payload.customer_id
        ).first()
        if customer:
            customer.loyalty_points += int(grand_total // 100)

    db.commit()
    db.refresh(sale)

    # MODULE 19: notification + customer email on order success
    db.add(models.Notification(
        type="order_success",
        title=f"New sale #{sale.sale_id}",
        message=f"Total \u20b9{sale.grand_total:.2f} via {sale.payment_method}.",
    ))
    db.commit()

    if payload.customer_id:
        customer = db.query(models.Customer).filter(models.Customer.customer_id == payload.customer_id).first()
        if customer and customer.email:
            send_email(
                customer.email,
                f"Your E-commerce invoice #{sale.sale_id}",
                f"Thank you for shopping with us!\n\nInvoice #{sale.sale_id}\n"
                f"Subtotal: \u20b9{sale.subtotal:.2f}\nDiscount: \u20b9{sale.discount:.2f}\n"
                f"GST: \u20b9{sale.gst_amount:.2f}\nGrand Total: \u20b9{sale.grand_total:.2f}\n"
                f"Payment method: {sale.payment_method}\n\n"
                f"You earned loyalty points on this purchase. See you again soon!",
            )

    return sale


@router.put("/{sale_id}", response_model=schemas.SaleOut)
def update_sale(
    sale_id: int,
    payload: schemas.SaleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    """Admin-only: edit a sale's items, quantities, prices, discount, etc."""
    sale = (
        db.query(models.Sale)
        .options(
            joinedload(models.Sale.items).joinedload(models.SaleItem.product),
            joinedload(models.Sale.customer),
        )
        .filter(models.Sale.sale_id == sale_id)
        .first()
    )
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if not payload.items:
        raise HTTPException(status_code=400, detail="A sale must have at least one item")

    # 1) Restore stock for all old items
    for item in list(sale.items):
        product = db.query(models.Product).filter(
            models.Product.product_id == item.product_id
        ).with_for_update().first()
        if product:
            product.stock_quantity += item.quantity
            db.add(models.InventoryLog(
                product_id=product.product_id,
                change_type="return",
                quantity_change=item.quantity,
                stock_after=product.stock_quantity,
                note=f"Stock restored from edited invoice #{sale_id}",
            ))

    # 2) Reverse loyalty points
    if sale.customer_id:
        customer = db.query(models.Customer).filter(
            models.Customer.customer_id == sale.customer_id
        ).first()
        if customer:
            old_points = int(sale.grand_total // 100)
            customer.loyalty_points = max(0, customer.loyalty_points - old_points)

    # 3) Delete old sale items via relationship (respects cascade)
    sale.items.clear()
    db.flush()

    # 4) Validate new items & build line items
    subtotal = 0.0
    line_items = []
    for item in payload.items:
        product = db.query(models.Product).filter(
            models.Product.product_id == item.product_id
        ).with_for_update().first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product id {item.product_id} not found")
        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}' "
                       f"(available: {product.stock_quantity}, requested: {item.quantity})",
            )
        if product.mrp and product.mrp > 0 and item.unit_price > product.mrp:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot sell '{product.name}' above MRP. "
                       f"Selling price ₹{item.unit_price} exceeds MRP ₹{product.mrp}",
            )
        line_total = round(item.unit_price * item.quantity, 2)
        subtotal += line_total
        line_items.append((product, item, line_total))

    discount = min(payload.discount, subtotal)
    taxable_amount = subtotal - discount
    gst_amount = round(taxable_amount * (payload.gst_percent / 100), 2)
    grand_total = round(taxable_amount + gst_amount, 2)

    # 5) Update sale header
    sale.customer_id = payload.customer_id
    sale.discount = round(discount, 2)
    sale.gst_amount = gst_amount
    sale.grand_total = grand_total
    sale.payment_method = payload.payment_method

    # 6) Create new sale items, decrement stock, write inventory logs
    for product, item, line_total in line_items:
        db.add(models.SaleItem(
            sale_id=sale.sale_id,
            product_id=product.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=line_total,
        ))
        product.stock_quantity -= item.quantity
        db.add(models.InventoryLog(
            product_id=product.product_id,
            change_type="sale",
            quantity_change=-item.quantity,
            stock_after=product.stock_quantity,
            note=f"Updated in invoice #{sale.sale_id}",
        ))

    sale.subtotal = round(subtotal, 2)

    # 7) Re-apply loyalty points
    if payload.customer_id:
        customer = db.query(models.Customer).filter(
            models.Customer.customer_id == payload.customer_id
        ).first()
        if customer:
            customer.loyalty_points += int(grand_total // 100)

    db.add(models.Notification(
        type="system",
        title=f"Invoice #{sale_id} updated",
        message=f"Invoice #{sale_id} was edited by {current_user.username}. New total: ₹{grand_total:.2f}",
    ))
    db.commit()
    db.refresh(sale)
    return sale


@router.delete("/{sale_id}", status_code=204)
def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    """Owner-only: delete a sale and restore all stock."""
    sale = (
        db.query(models.Sale)
        .options(
            joinedload(models.Sale.items).joinedload(models.SaleItem.product),
            joinedload(models.Sale.customer),
        )
        .filter(models.Sale.sale_id == sale_id)
        .first()
    )
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    for item in sale.items:
        product = db.query(models.Product).filter(
            models.Product.product_id == item.product_id
        ).with_for_update().first()
        if product:
            product.stock_quantity += item.quantity
            db.add(models.InventoryLog(
                product_id=product.product_id,
                change_type="return",
                quantity_change=item.quantity,
                stock_after=product.stock_quantity,
                note=f"Stock restored from deleted invoice #{sale_id}",
            ))

    if sale.customer_id:
        customer = db.query(models.Customer).filter(
            models.Customer.customer_id == sale.customer_id
        ).first()
        if customer:
            points = int(sale.grand_total // 100)
            customer.loyalty_points = max(0, customer.loyalty_points - points)

    db.query(models.SaleItem).filter(models.SaleItem.sale_id == sale_id).delete()
    db.delete(sale)

    db.add(models.Notification(
        type="system",
        title=f"Invoice #{sale_id} deleted",
        message=f"Invoice #{sale_id} (₹{sale.grand_total:.2f}) was deleted by {current_user.username}.",
    ))
    db.commit()
