"""
routers/forecasting.py
------------------------
MODULE 12 - AI SALES FORECASTING

Predicts next-week demand per product using a simple, transparent method:
a weighted moving average of the last N days' sales, extrapolated forward,
plus a basic linear trend adjustment. This is intentionally NOT a deep
learning model - for a small provision store's sales volume, a lightweight
statistical approach is both more explainable to a store owner and doesn't
require training/maintaining a model. It's implemented in pure Python
(no numpy/pandas/sklearn dependency required), so it works with zero
extra installs.

If you outgrow this later, the natural upgrade path is Facebook Prophet
or a simple ARIMA model per product - the API shape here (avg_daily_sales,
next_7_days, reorder_recommendation) would stay the same.
"""

from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_staff_user
from app.database import get_db

router = APIRouter(prefix="/forecast", tags=["AI Sales Forecasting"])

LOOKBACK_DAYS = 30


def _daily_sales_series(db: Session, product_id: int, days: int) -> List[float]:
    start = date.today() - timedelta(days=days)
    rows = (
        db.query(
            func.date(models.Sale.sale_date).label("day"),
            func.coalesce(func.sum(models.SaleItem.quantity), 0).label("qty"),
        )
        .join(models.SaleItem, models.SaleItem.sale_id == models.Sale.sale_id)
        .filter(models.SaleItem.product_id == product_id, models.Sale.sale_date >= start)
        .group_by(func.date(models.Sale.sale_date))
        .all()
    )
    by_day = {str(r.day): float(r.qty) for r in rows}

    series = []
    for i in range(days):
        d = start + timedelta(days=i)
        series.append(by_day.get(str(d), 0.0))
    return series


def _forecast_product(db: Session, product: models.Product) -> schemas.ProductForecastOut:
    series = _daily_sales_series(db, product.product_id, LOOKBACK_DAYS)
    n = len(series)
    total = sum(series)
    avg_daily = total / n if n else 0.0

    # Simple linear trend: compare the first half's average vs the second
    # half's average to catch whether sales are speeding up or slowing down.
    half = n // 2 or 1
    first_half_avg = sum(series[:half]) / half if half else 0
    second_half_avg = sum(series[half:]) / (n - half) if (n - half) else first_half_avg
    trend = (second_half_avg - first_half_avg) / max(first_half_avg, 0.01)
    trend = max(-0.5, min(0.5, trend))  # clamp to +/-50% to avoid wild extrapolation

    next_7 = []
    for i in range(7):
        predicted = max(0, avg_daily * (1 + trend * (i / 7)))
        next_7.append(
            schemas.ForecastPoint(
                date=(date.today() + timedelta(days=i + 1)).isoformat(),
                predicted_units=round(predicted, 2),
            )
        )

    days_until_stockout = (
        round(product.stock_quantity / avg_daily, 1) if avg_daily > 0 else None
    )

    if avg_daily <= 0:
        recommendation = "No recent sales data - monitor before reordering."
    elif days_until_stockout is not None and days_until_stockout <= 3:
        recommendation = f"Reorder now - stock will run out in about {days_until_stockout} day(s)."
    elif days_until_stockout is not None and days_until_stockout <= 7:
        recommendation = f"Reorder soon - stock will run out in about {days_until_stockout} day(s)."
    else:
        recommendation = "Stock is healthy for now based on current sales pace."

    return schemas.ProductForecastOut(
        product_id=product.product_id,
        product_name=product.name,
        avg_daily_sales=round(avg_daily, 2),
        current_stock=product.stock_quantity,
        days_until_stockout=days_until_stockout,
        reorder_recommendation=recommendation,
        next_7_days=next_7,
    )


@router.get("/product/{product_id}", response_model=schemas.ProductForecastOut)
def forecast_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    product = db.query(models.Product).filter(models.Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _forecast_product(db, product)


@router.get("/reorder-recommendations", response_model=List[schemas.ProductForecastOut])
def reorder_recommendations(
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    """Every active product, forecasted, sorted by most urgent reorder first."""
    products = db.query(models.Product).filter(models.Product.is_active == True).all()  # noqa: E712
    forecasts = [_forecast_product(db, p) for p in products]
    forecasts.sort(
        key=lambda f: (f.days_until_stockout if f.days_until_stockout is not None else 9999)
    )
    return forecasts[:limit]
