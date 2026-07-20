"""
utils/whatsapp.py
-----------------
WhatsApp Business Cloud API integration.
Send order status notifications to customers via WhatsApp.

Configure WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env
to enable real WhatsApp messages. Without configuration, messages
are printed to the console (dev mode).
"""
import json
from app.config import settings


def send_whatsapp_message(phone: str, message: str) -> bool:
    """Send a WhatsApp message. Returns True if sent, False if dev-only."""
    if not getattr(settings, "WHATSAPP_TOKEN", None):
        print("=" * 70)
        print("[DEV WHATSAPP - not configured, printing instead]")
        print(f"To: {phone}")
        print(f"Message: {message}")
        print("=" * 70)
        return False
    try:
        import requests
        url = f"https://graph.facebook.com/v18.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "text",
            "text": {"body": message},
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        return resp.status_code == 200
    except Exception as e:
        print(f"[WHATSAPP ERROR] {e}")
        return False


def send_order_ready_whatsapp(phone: str, order_id: int, total: float, fulfillment: str) -> bool:
    if fulfillment == "takeaway":
        msg = (
            f"Hello! Your order #{order_id} is ready for pickup.\n"
            f"Total: ₹{total:.2f}\n"
            f"Please collect from E-commerce.\n"
            f"Thank you!"
        )
    else:
        msg = (
            f"Hello! Your order #{order_id} has been packed.\n"
            f"Total: ₹{total:.2f}\n"
            f"Our delivery partner will deliver it shortly.\n"
            f"Thank you!"
        )
    return send_whatsapp_message(phone, msg)


def send_order_delivered_whatsapp(phone: str, order_id: int) -> bool:
    msg = (
        f"Hello! Your order #{order_id} has been delivered.\n"
        f"We hope you enjoyed your shopping!\n"
        f"Thank you for choosing E-commerce."
    )
    return send_whatsapp_message(phone, msg)
