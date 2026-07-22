"""
utils/email.py
---------------
A tiny, dependency-free email sender.

If SMTP_HOST is configured in .env, it sends a real email via smtplib.
Otherwise (the default for local development), it just prints the
email to the backend console so you can copy the link/OTP out of the
terminal while testing - no mail server required to try the feature.
"""

import smtplib
import ssl
from email.message import EmailMessage

from app.config import settings


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Returns True if the email was actually sent via SMTP, False if it
    was only printed to the console (dev fallback)."""

    if not settings.SMTP_HOST:
        print("=" * 70)
        print(f"[DEV EMAIL - SMTP not configured, printing instead of sending]")
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

    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=15, context=context)
        else:
            server = smtplib.SMTP(host, port, timeout=15)
            server.starttls(context=context)
        if user and pwd:
            server.login(user, pwd)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print(f"[SMTP ERROR] {e}")
        raise

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
