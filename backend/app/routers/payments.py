"""
routers/payments.py
---------------------
MODULE 16 - PAYMENT (Razorpay integration)

Cash / UPI / Card / COD need no special backend logic - they're just
values on Sale.payment_method (handled entirely in routers/sales.py).

Razorpay needs a real order created server-side before the frontend can
open its checkout widget, plus signature verification after payment.

UPI QR Code:
    GET /payments/upi-config     returns UPI ID + name
    GET /payments/upi-qr?amount= returns a base64 PNG QR code
"""

import io
import base64

from fastapi import APIRouter, Depends, HTTPException, Query

from app import models, schemas
from app.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/payments", tags=["Payments"])


def _get_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=501,
            detail="Razorpay is not configured. Set RAZORPAY_KEY_ID and "
            "RAZORPAY_KEY_SECRET in backend/.env to enable this payment method.",
        )
    try:
        import razorpay
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="Razorpay support requires the 'razorpay' package. Install with: pip install razorpay",
        )
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


@router.get("/config")
def payment_config():
    """Frontend calls this on load to know whether to show the Razorpay
    button at all (avoids a broken checkout button if keys aren't set)."""
    return {"razorpay_enabled": bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)}


@router.post("/razorpay/create-order", response_model=schemas.RazorpayOrderOut)
def create_razorpay_order(payload: schemas.RazorpayOrderCreate, current_user=Depends(get_current_user)):
    client = _get_client()
    amount_paise = int(round(payload.amount * 100))

    try:
        order = client.order.create({"amount": amount_paise, "currency": "INR", "payment_capture": 1})
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Razorpay order creation failed: {e}")

    return schemas.RazorpayOrderOut(
        order_id=order["id"],
        amount=amount_paise,
        currency="INR",
        key_id=settings.RAZORPAY_KEY_ID,
    )


@router.post("/razorpay/verify")
def verify_razorpay_payment(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    current_user=Depends(get_current_user),
):
    client = _get_client()
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            }
        )
        return {"verified": True}
    except Exception:
        raise HTTPException(status_code=400, detail="Payment signature verification failed")


# ===========================================================================
# UPI QR Code
# ===========================================================================
@router.get("/upi-config")
def upi_config():
    """Return the store's UPI details so the frontend can build the URI."""
    return {"upi_id": settings.UPI_ID, "upi_name": settings.UPI_NAME}


@router.get("/upi-qr")
def upi_qr(amount: float = Query(..., gt=0), txn_note: str = "E-commerce"):
    """
    Generate a UPI QR code as a base64 PNG.
    The QR encodes a standard UPI URI: upi://pay?pa=...&pn=...&am=...&tn=...
    Any UPI app (PhonePe, GPay, Paytm, etc.) can scan it.
    """
    try:
        import qrcode
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="QR generation requires the 'qrcode' package. Install with: pip install qrcode pillow",
        )

    upi_uri = (
        f"upi://pay?"
        f"pa={settings.UPI_ID}"
        f"&pn={settings.UPI_NAME}"
        f"&am={amount:.2f}"
        f"&cu=INR"
        f"&tn={txn_note}"
    )

    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
    qr.add_data(upi_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    return {
        "qr_image": f"data:image/png;base64,{b64}",
        "upi_id": settings.UPI_ID,
        "upi_name": settings.UPI_NAME,
        "amount": amount,
        "upi_uri": upi_uri,
    }
