"""
utils/email.py
---------------
Email sender that works on any hosting platform.

Uses Resend HTTP API (free tier: 100 emails/day, no domain needed).
Falls back to SMTP for local development.
"""

import smtplib
import ssl
import requests
from email.message import EmailMessage

from app.config import settings


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send an email via Resend API (preferred) or SMTP fallback."""

    # --- Resend API (works on Render, Vercel, any cloud) ---
    if settings.RESEND_API_KEY:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.EMAIL_FROM,
                "to": [to_email],
                "subject": subject,
                "text": body,
            },
            timeout=15,
        )
        if resp.status_code >= 400:
            print(f"[RESEND ERROR] {resp.status_code}: {resp.text}")
            raise Exception(f"Resend API error: {resp.text}")
        print(f"[RESEND OK] Email sent to {to_email}")
        return True

    # --- SMTP fallback (for local dev only) ---
    if not settings.SMTP_HOST:
        print("=" * 70)
        print(f"[DEV EMAIL - No email service configured, printing to console]")
        print(f"To      : {to_email}")
        print(f"Subject : {subject}")
        print("-" * 70)
        print(body)
        print("=" * 70)
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email
    msg.set_content(body)

    context = ssl.create_default_context()
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT or 587
    user = settings.SMTP_USER
    pwd = settings.SMTP_PASSWORD

    if port == 465:
        server = smtplib.SMTP_SSL(host, port, timeout=15, context=context)
    else:
        server = smtplib.SMTP(host, port, timeout=15)
        server.starttls(context=context)
    if user and pwd:
        server.login(user, pwd)
    server.send_message(msg)
    server.quit()
    return True


def send_verification_email(to_email: str, name: str, token: str, frontend_url: str) -> bool:
    link = f"{frontend_url}/verify-email?token={token}"
    body = (
        f"Hi {name},\n\n"
        f"Welcome to E-commerce! Please verify your email by "
        f"clicking the link below:\n\n{link}\n\n"
        f"This link expires in {settings.VERIFICATION_TOKEN_EXPIRE_HOURS} hours.\n\n"
        f"If you didn't create this account, you can ignore this email."
    )
    return send_email(to_email, "Verify your E-commerce account", body)


def send_password_reset_email(to_email: str, name: str, token: str, frontend_url: str) -> bool:
    link = f"{frontend_url}/reset-password?token={token}"
    body = (
        f"Hi {name},\n\n"
        f"We received a request to reset your password. Click the link "
        f"below to choose a new one:\n\n{link}\n\n"
        f"This link expires in {settings.RESET_TOKEN_EXPIRE_MINUTES} minutes.\n\n"
        f"If you didn't request this, you can safely ignore this email - "
        f"your password will not be changed."
    )
    return send_email(to_email, "Reset your E-commerce password", body)


def send_password_changed_notification(to_email: str, name: str) -> bool:
    body = (
        f"Hi {name},\n\n"
        f"This is a confirmation that your E-commerce account password "
        f"was changed successfully.\n\n"
        f"If you did not make this change, please contact support "
        f"immediately and reset your password."
    )
    return send_email(to_email, "Your E-commerce password was changed", body)
