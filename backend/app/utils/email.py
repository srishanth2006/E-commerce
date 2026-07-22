"""
utils/email.py
--------------
Email sender using Gmail SMTP.
"""

import smtplib
import ssl
from email.message import EmailMessage
from app.config import settings


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send an email via Gmail SMTP."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email
    msg.set_content(body)

    context = ssl.create_default_context()
    server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15, context=context)
    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
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
