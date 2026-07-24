"""
main.py
-------
Entry point for the E-commerce Management System API.

Run with:
    uvicorn app.main:app --reload

Swagger UI docs available at:
    http://localhost:8000/docs
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import Base, engine
from app import models  # noqa: F401  (needed so Base knows about all tables)
from app.middleware import limiter
from app.routers import (
    auth, products, categories, brands, customers, suppliers, sales, inventory, dashboard,
    purchases, storefront, forecasting, chatbot, payments, search, reports, notifications,
    orders, coupons, referrals, websocket, support, seed,
)

# Tables are created on startup in on_startup()

app = FastAPI(
    title="E-commerce Management System API",
    description="Backend REST API for a small family-owned grocery / provision store.",
    version="1.0.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# CORS - allows the React frontend (running on a different port) to call us
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded product images statically, e.g. GET /uploads/products/xyz.jpg
os.makedirs("uploads/products", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(brands.router)
app.include_router(customers.router)
app.include_router(suppliers.router)
app.include_router(sales.router)
app.include_router(inventory.router)
app.include_router(dashboard.router)
app.include_router(purchases.router)
app.include_router(storefront.router)
app.include_router(forecasting.router)
app.include_router(chatbot.router)
app.include_router(payments.router)
app.include_router(search.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(orders.router)
app.include_router(coupons.router)
app.include_router(referrals.router)
app.include_router(websocket.router)
app.include_router(support.router)
app.include_router(seed.router)


@app.on_event("startup")
def on_startup():
    import asyncio
    import logging
    try:
        loop = asyncio.get_event_loop()
        websocket.set_event_loop(loop)
    except RuntimeError:
        pass

    # Migration: ensure phone column exists on support_tickets
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE support_tickets ADD COLUMN phone VARCHAR(20)"))
            conn.commit()
    except Exception:
        pass  # Column already exists


@app.get("/", tags=["Health"])
def root():
    return {"message": "E-commerce Management System API is running", "docs": "/docs"}
