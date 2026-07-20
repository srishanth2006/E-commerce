"""
routers/dashboard.py
---------------------
MODULE 11 - SALES REPORTS
MODULE 18 - ANALYTICS DASHBOARD
MODULE 9  - EXPIRY MANAGEMENT (dashboard widget)

Aggregated data for the dashboard screen and the Reports charts.
All endpoints here are staff-only (business data shouldn't be public).
"""

from datetime import datetime, date, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.auth import get_current_staff_user
from app.database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"], dependencies=[Depends(get_current_staff_user)])


@router.get("/summary", response_model=schemas.DashboardSummary)
def summary(db: Session = Depends(get_db)):
    today_start = datetime.combine(date.today(), datetime.min.time())
    month_start = today_start.replace(day=1)
    near_expiry_cutoff = date.today() + timedelta(days=30)

    total_products = db.query(func.count(models.Product.product_id)).scalar() or 0

    low_stock_items = (
        db.query(func.count(models.Product.product_id))
        .filter(models.Product.stock_quantity <= models.Product.reorder_level, models.Product.stock_quantity > 0)
        .scalar() or 0
    )
    out_of_stock_items = (
        db.query(func.count(models.Product.product_id))
        .filter(models.Product.stock_quantity <= 0)
        .scalar() or 0
    )
    expired_items = (
        db.query(func.count(models.Product.product_id))
        .filter(models.Product.expiry_date.isnot(None), models.Product.expiry_date < date.today())
        .scalar() or 0
    )
    near_expiry_items = (
        db.query(func.count(models.Product.product_id))
        .filter(
            models.Product.expiry_date.isnot(None),
            models.Product.expiry_date >= date.today(),
            models.Product.expiry_date <= near_expiry_cutoff,
        )
        .scalar() or 0
    )

    todays_sales = (
        db.query(func.coalesce(func.sum(models.Sale.grand_total), 0))
        .filter(models.Sale.sale_date >= today_start)
        .scalar() or 0
    )
    todays_online = (
        db.query(func.coalesce(func.sum(models.Order.grand_total), 0))
        .filter(models.Order.created_at >= today_start, models.Order.status != "cancelled")
        .scalar() or 0
    )
    monthly_revenue = (
        db.query(func.coalesce(func.sum(models.Sale.grand_total), 0))
        .filter(models.Sale.sale_date >= month_start)
        .scalar() or 0
    )
    monthly_online = (
        db.query(func.coalesce(func.sum(models.Order.grand_total), 0))
        .filter(models.Order.created_at >= month_start, models.Order.status != "cancelled")
        .scalar() or 0
    )
    total_customers = db.query(func.count(models.Customer.customer_id)).scalar() or 0
    pos_orders = db.query(func.count(models.Sale.sale_id)).scalar() or 0
    online_orders = db.query(func.count(models.Order.id)).scalar() or 0
    total_orders = pos_orders + online_orders

    # Profit = sum((selling_price - purchase_price) * qty) for items sold this month
    profit_row = (
        db.query(
            func.coalesce(
                func.sum(
                    (models.SaleItem.unit_price - models.Product.purchase_price) * models.SaleItem.quantity
                ),
                0,
            )
        )
        .join(models.Product, models.Product.product_id == models.SaleItem.product_id)
        .join(models.Sale, models.Sale.sale_id == models.SaleItem.sale_id)
        .filter(models.Sale.sale_date >= month_start)
        .scalar()
        or 0
    )

    return schemas.DashboardSummary(
        total_products=total_products,
        low_stock_items=low_stock_items,
        out_of_stock_items=out_of_stock_items,
        expired_items=expired_items,
        near_expiry_items=near_expiry_items,
        todays_sales=float(todays_sales) + float(todays_online),
        monthly_revenue=float(monthly_revenue) + float(monthly_online),
        total_customers=total_customers,
        total_orders=total_orders,
        profit_this_month=round(float(profit_row), 2),
    )


@router.get("/recent-sales", response_model=List[schemas.SaleOut])
def recent_sales(limit: int = 10, db: Session = Depends(get_db)):
    return (
        db.query(models.Sale)
        .options(
            joinedload(models.Sale.items).joinedload(models.SaleItem.product),
            joinedload(models.Sale.customer),
        )
        .order_by(models.Sale.sale_date.desc())
        .limit(limit)
        .all()
    )


@router.get("/low-stock", response_model=List[schemas.ProductOut])
def low_stock(db: Session = Depends(get_db)):
    return (
        db.query(models.Product)
        .options(joinedload(models.Product.category))
        .filter(models.Product.stock_quantity <= models.Product.reorder_level)
        .order_by(models.Product.stock_quantity.asc())
        .all()
    )


@router.get("/expiry-status")
def expiry_status(db: Session = Depends(get_db)):
    """MODULE 9 - buckets: expired / expiring in 15 days / expiring in 30 days."""
    today = date.today()
    in_15 = today + timedelta(days=15)
    in_30 = today + timedelta(days=30)

    def _bucket(products):
        return [{"product_id": p.product_id, "name": p.name, "expiry_date": p.expiry_date.isoformat(), "stock_quantity": p.stock_quantity} for p in products]

    expired = db.query(models.Product).filter(models.Product.expiry_date.isnot(None), models.Product.expiry_date < today).all()
    expiring_15 = db.query(models.Product).filter(models.Product.expiry_date >= today, models.Product.expiry_date <= in_15).all()
    expiring_30 = db.query(models.Product).filter(models.Product.expiry_date > in_15, models.Product.expiry_date <= in_30).all()

    return {
        "expired": _bucket(expired),
        "expiring_within_15_days": _bucket(expiring_15),
        "expiring_within_30_days": _bucket(expiring_30),
    }


@router.get("/sales-trend")
def sales_trend(days: int = 14, db: Session = Depends(get_db)):
    """MODULE 11 - Daily sales total for the last N days."""
    start = datetime.combine(date.today() - timedelta(days=days - 1), datetime.min.time())
    rows = (
        db.query(
            func.date(models.Sale.sale_date).label("day"),
            func.coalesce(func.sum(models.Sale.grand_total), 0).label("total"),
        )
        .filter(models.Sale.sale_date >= start)
        .group_by(func.date(models.Sale.sale_date))
        .order_by(func.date(models.Sale.sale_date))
        .all()
    )
    data_by_day = {str(r.day): float(r.total) for r in rows}
    result = []
    for i in range(days):
        d = date.today() - timedelta(days=days - 1 - i)
        result.append({"date": d.isoformat(), "total": data_by_day.get(str(d), 0)})
    return result


@router.get("/sales-by-period")
def sales_by_period(
    period: str = Query("daily", pattern="^(daily|weekly|monthly|yearly)$"),
    db: Session = Depends(get_db),
):
    """MODULE 11 - sales grouped by day/week/month/year."""
    fmt_map = {"daily": "%Y-%m-%d", "weekly": "%x-W%v", "monthly": "%Y-%m", "yearly": "%Y"}
    fmt = fmt_map[period]
    rows = (
        db.query(
            func.date_format(models.Sale.sale_date, fmt).label("period"),
            func.coalesce(func.sum(models.Sale.grand_total), 0).label("total"),
            func.count(models.Sale.sale_id).label("orders"),
        )
        .group_by("period")
        .order_by("period")
        .all()
    )
    return [{"period": r.period, "total": float(r.total), "orders": int(r.orders)} for r in rows]


@router.get("/monthly-revenue")
def monthly_revenue_trend(months: int = 6, db: Session = Depends(get_db)):
    rows = (
        db.query(
            func.date_format(models.Sale.sale_date, "%Y-%m").label("month"),
            func.coalesce(func.sum(models.Sale.grand_total), 0).label("total"),
        )
        .group_by("month")
        .order_by("month")
        .all()
    )
    return [{"month": r.month, "total": float(r.total)} for r in rows][-months:]


@router.get("/best-selling")
def best_selling_products(limit: int = 5, db: Session = Depends(get_db)):
    rows = (
        db.query(
            models.Product.name,
            func.coalesce(func.sum(models.SaleItem.quantity), 0).label("qty_sold"),
        )
        .join(models.SaleItem, models.SaleItem.product_id == models.Product.product_id)
        .group_by(models.Product.product_id)
        .order_by(func.sum(models.SaleItem.quantity).desc())
        .limit(limit)
        .all()
    )
    return [{"name": r.name, "qty_sold": float(r.qty_sold)} for r in rows]


@router.get("/least-selling")
def least_selling_products(limit: int = 5, db: Session = Depends(get_db)):
    """MODULE 11 - products with the lowest (but nonzero) sales volume."""
    rows = (
        db.query(
            models.Product.name,
            func.coalesce(func.sum(models.SaleItem.quantity), 0).label("qty_sold"),
        )
        .join(models.SaleItem, models.SaleItem.product_id == models.Product.product_id)
        .group_by(models.Product.product_id)
        .order_by(func.sum(models.SaleItem.quantity).asc())
        .limit(limit)
        .all()
    )
    return [{"name": r.name, "qty_sold": float(r.qty_sold)} for r in rows]


@router.get("/profit-loss")
def profit_loss(days: int = 30, db: Session = Depends(get_db)):
    """MODULE 11 - daily profit (revenue - cost) for the last N days."""
    start = datetime.combine(date.today() - timedelta(days=days - 1), datetime.min.time())
    rows = (
        db.query(
            func.date(models.Sale.sale_date).label("day"),
            func.coalesce(
                func.sum((models.SaleItem.unit_price - models.Product.purchase_price) * models.SaleItem.quantity),
                0,
            ).label("profit"),
            func.coalesce(func.sum(models.SaleItem.total_price), 0).label("revenue"),
        )
        .join(models.Product, models.Product.product_id == models.SaleItem.product_id)
        .join(models.Sale, models.Sale.sale_id == models.SaleItem.sale_id)
        .filter(models.Sale.sale_date >= start)
        .group_by(func.date(models.Sale.sale_date))
        .order_by(func.date(models.Sale.sale_date))
        .all()
    )
    return [{"date": str(r.day), "profit": float(r.profit), "revenue": float(r.revenue)} for r in rows]


@router.get("/category-sales")
def category_wise_sales(db: Session = Depends(get_db)):
    rows = (
        db.query(
            models.Category.name,
            func.coalesce(func.sum(models.SaleItem.total_price), 0).label("total"),
        )
        .join(models.Product, models.Product.category_id == models.Category.category_id)
        .join(models.SaleItem, models.SaleItem.product_id == models.Product.product_id)
        .group_by(models.Category.category_id)
        .order_by(func.sum(models.SaleItem.total_price).desc())
        .all()
    )
    return [{"name": r.name, "total": float(r.total)} for r in rows]


@router.get("/inventory-status")
def inventory_status(db: Session = Depends(get_db)):
    """Counts of products in healthy / low / out-of-stock bands, for a pie chart."""
    healthy = db.query(func.count(models.Product.product_id)).filter(
        models.Product.stock_quantity > models.Product.reorder_level
    ).scalar() or 0
    low = db.query(func.count(models.Product.product_id)).filter(
        models.Product.stock_quantity <= models.Product.reorder_level, models.Product.stock_quantity > 0
    ).scalar() or 0
    out = db.query(func.count(models.Product.product_id)).filter(models.Product.stock_quantity <= 0).scalar() or 0
    return [
        {"name": "Healthy", "value": healthy},
        {"name": "Low Stock", "value": low},
        {"name": "Out of Stock", "value": out},
    ]
