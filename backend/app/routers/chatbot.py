"""
routers/chatbot.py
--------------------
MODULE 13 - AI CHATBOT

Handles common store questions with fast, deterministic, DB-backed
intent matching (works with zero setup):
    Customer: "Where is Rice?", "Do you have Milk?",
              "Suggest breakfast products", "Show products below Rs 100"
    Admin:    "Today's sales", "Low stock products", "Revenue",
              "Best selling products"

OLLAMA INTEGRATION (optional):
If OLLAMA_URL is set in .env and a query doesn't match any known intent,
we forward it to your local Ollama instance for a freeform LLM response.
I cannot run or verify Ollama from my sandbox (no local model access
there), so this path is written defensively - if Ollama isn't reachable,
we fall back to a helpful "I didn't understand that" message instead of
crashing. Test this yourself with `ollama serve` running locally.
"""

import re
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/chatbot", tags=["AI Chatbot"])

BREAKFAST_KEYWORDS = ["bread", "milk", "egg", "butter", "jam", "cereal", "oats", "tea", "coffee"]


def _try_ollama(prompt: str) -> Optional[str]:
    if not getattr(settings, "OLLAMA_URL", None):
        return None
    try:
        import requests

        resp = requests.post(
            f"{settings.OLLAMA_URL}/api/generate",
            json={"model": "llama3", "prompt": prompt, "stream": False},
            timeout=15,
        )
        if resp.status_code == 200:
            return resp.json().get("response", "").strip() or None
    except Exception:
        return None
    return None


def _handle_customer_query(message: str, db: Session) -> schemas.ChatResponse:
    text = message.lower().strip()

    # "Where is <product>?" / "do you have <product>?"
    where_match = re.search(r"where\s+is\s+([a-z0-9 ]+)", text)
    have_match = re.search(r"(?:do you have|have you got|got any)\s+([a-z0-9 ]+)", text)
    product_query = None
    if where_match:
        product_query = where_match.group(1).strip()
    elif have_match:
        product_query = have_match.group(1).strip()

    if product_query:
        products = (
            db.query(models.Product)
            .filter(models.Product.name.ilike(f"%{product_query}%"), models.Product.is_active == True)  # noqa: E712
            .limit(5)
            .all()
        )
        if products:
            names = ", ".join(f"{p.name} (\u20b9{p.selling_price:.0f}, {int(p.stock_quantity)} in stock)" for p in products)
            cat_names = {p.category.name for p in products if p.category}
            aisle_hint = f" You'll find it in the {', '.join(cat_names)} section." if cat_names else ""
            return schemas.ChatResponse(
                reply=f"Yes! We have: {names}.{aisle_hint}",
                data={"products": [p.product_id for p in products]},
            )
        return schemas.ChatResponse(reply=f"Sorry, I couldn't find '{product_query}' in stock right now.")

    # "Show products below Rs X" / "under X"
    price_match = re.search(r"(?:below|under)\s*(?:rs\.?|\u20b9)?\s*(\d+)", text)
    if price_match:
        max_price = float(price_match.group(1))
        products = (
            db.query(models.Product)
            .filter(models.Product.selling_price <= max_price, models.Product.is_active == True)  # noqa: E712
            .order_by(models.Product.selling_price)
            .limit(10)
            .all()
        )
        if products:
            names = ", ".join(f"{p.name} (\u20b9{p.selling_price:.0f})" for p in products)
            return schemas.ChatResponse(reply=f"Products under \u20b9{max_price:.0f}: {names}")
        return schemas.ChatResponse(reply=f"I couldn't find anything under \u20b9{max_price:.0f} right now.")

    # "Suggest breakfast products"
    if "breakfast" in text:
        conditions = [models.Product.name.ilike(f"%{kw}%") for kw in BREAKFAST_KEYWORDS]
        from sqlalchemy import or_
        products = (
            db.query(models.Product)
            .filter(or_(*conditions), models.Product.is_active == True)  # noqa: E712
            .limit(8)
            .all()
        )
        if products:
            names = ", ".join(p.name for p in products)
            return schemas.ChatResponse(reply=f"Great breakfast picks: {names}")
        return schemas.ChatResponse(reply="I don't have specific breakfast suggestions right now, but check our Dairy and Snacks sections!")

    return None  # no intent matched


def _handle_staff_query(message: str, db: Session) -> schemas.ChatResponse:
    text = message.lower().strip()

    if "today" in text and "sale" in text:
        today_start = datetime.combine(date.today(), datetime.min.time())
        total = db.query(func.coalesce(func.sum(models.Sale.grand_total), 0)).filter(
            models.Sale.sale_date >= today_start
        ).scalar() or 0
        count = db.query(func.count(models.Sale.sale_id)).filter(models.Sale.sale_date >= today_start).scalar() or 0
        return schemas.ChatResponse(reply=f"Today's sales: \u20b9{float(total):.2f} across {count} transaction(s).")

    if "low stock" in text:
        products = (
            db.query(models.Product)
            .filter(models.Product.stock_quantity <= models.Product.reorder_level)
            .limit(10)
            .all()
        )
        if products:
            names = ", ".join(f"{p.name} ({int(p.stock_quantity)} left)" for p in products)
            return schemas.ChatResponse(reply=f"Low stock items: {names}")
        return schemas.ChatResponse(reply="Nothing is low on stock right now. \U0001F44D")

    if "revenue" in text:
        month_start = datetime.combine(date.today().replace(day=1), datetime.min.time())
        total = db.query(func.coalesce(func.sum(models.Sale.grand_total), 0)).filter(
            models.Sale.sale_date >= month_start
        ).scalar() or 0
        return schemas.ChatResponse(reply=f"This month's revenue so far: \u20b9{float(total):.2f}")

    if "best" in text and "sell" in text:
        rows = (
            db.query(models.Product.name, func.sum(models.SaleItem.quantity).label("qty"))
            .join(models.SaleItem, models.SaleItem.product_id == models.Product.product_id)
            .group_by(models.Product.product_id, models.Product.name)
            .order_by(func.sum(models.SaleItem.quantity).desc())
            .limit(5)
            .all()
        )
        if rows:
            names = ", ".join(f"{r.name} ({int(r.qty)} sold)" for r in rows)
            return schemas.ChatResponse(reply=f"Best sellers: {names}")
        return schemas.ChatResponse(reply="No sales recorded yet.")

    return None


@router.post("", response_model=schemas.ChatResponse)
def chat(
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),  # works for both staff and customer tokens
):
    handler = _handle_staff_query if payload.role_context == "staff" else _handle_customer_query
    result = handler(payload.message, db)

    if result is None:
        ollama_reply = _try_ollama(payload.message)
        if ollama_reply:
            result = schemas.ChatResponse(reply=ollama_reply)
        else:
            result = schemas.ChatResponse(
                reply="I'm not sure how to help with that yet. Try asking things like "
                "\"Where is Rice?\", \"Show products below \u20b9100\", or \"Today's sales\"."
            )

    db.add(models.ChatLog(session_id=payload.session_id, role="user", message=payload.message))
    db.add(models.ChatLog(session_id=payload.session_id, role="assistant", message=result.reply))
    db.commit()

    return result
