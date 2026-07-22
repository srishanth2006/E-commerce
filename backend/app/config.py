"""
config.py
---------
Central place that reads settings from the .env file.
We use pydantic-settings so every value is validated and typed.
"""

import os
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ---- Database (local-dev style parts) ----
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "sri_provision_store"

    # ---- Railway/Render style aliases (used if set) ----
    MYSQL_HOST: Optional[str] = None
    MYSQL_PORT: Optional[int] = None
    MYSQL_USER: Optional[str] = None
    MYSQL_PASSWORD: Optional[str] = None
    MYSQL_DATABASE: Optional[str] = None

    # ---- JWT / Auth ----
    SECRET_KEY: str = "insecure_dev_secret_change_me"
    JWT_SECRET: Optional[str] = None  # alias, wins over SECRET_KEY if set
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # ---- CORS ----
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    # Comma-separated extra origins, e.g. "https://your-app.vercel.app"
    CORS_ORIGINS: Optional[str] = None

    # ---- Email / SMTP (used for verification + password reset emails) ----
    RESEND_API_KEY: Optional[str] = None  # Resend HTTP API (preferred for cloud)
    SMTP_HOST: Optional[str] = None       # SMTP fallback (local dev only)
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "no-reply@sriprovision.local"

    # ---- Password reset / email verification token lifetime ----
    RESET_TOKEN_EXPIRE_MINUTES: int = 30
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24

    # ---- Dev convenience: if True, verification/reset links are echoed back
    # in the API response (never do this in a real production deployment -
    # it exists only so you can test the flow without configuring SMTP). ----
    DEV_EXPOSE_TOKENS: bool = True

    # ---- MODULE 13: AI Chatbot (optional Ollama passthrough) ----
    # Leave blank to use only the built-in rule-based responses.
    OLLAMA_URL: Optional[str] = None  # e.g. "http://localhost:11434"

    # ---- MODULE 16: Razorpay payments (optional) ----
    # Leave blank and the frontend will simply skip the Razorpay option.
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None

    # ---- WhatsApp Business Cloud API (optional) ----
    WHATSAPP_TOKEN: Optional[str] = None
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None

    # ---- UPI Settings ----
    UPI_ID: str = "srishanth244@okahdfcbank"
    UPI_NAME: str = "E-commerce"

    # ---- Google OAuth (for customer Gmail login) ----
    GOOGLE_CLIENT_ID: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    @property
    def SECRET(self) -> str:
        return self.JWT_SECRET or self.SECRET_KEY

    @property
    def DATABASE_URL(self) -> str:
        # A full DATABASE_URL (as Railway/Render provide) always wins.
        raw = os.environ.get("DATABASE_URL")
        if raw:
            if raw.startswith("mysql://"):
                raw = raw.replace("mysql://", "mysql+pymysql://", 1)
            return raw

        host = self.MYSQL_HOST or self.DB_HOST
        port = self.MYSQL_PORT or self.DB_PORT
        user = self.MYSQL_USER or self.DB_USER
        password = self.MYSQL_PASSWORD if self.MYSQL_PASSWORD is not None else self.DB_PASSWORD
        name = self.MYSQL_DATABASE or self.DB_NAME
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}"

    @property
    def cors_origins_list(self) -> List[str]:
        origins = {
            self.FRONTEND_ORIGIN,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://e-commerce-delta-rudy-52.vercel.app",
        }
        if self.CORS_ORIGINS:
            origins.update(o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip())
        # Auto-detect Vercel preview deployments
        vercel_url = os.environ.get("VERCEL_URL")
        if vercel_url:
            origins.add(f"https://{vercel_url}")
        return [o for o in origins if o]


settings = Settings()
