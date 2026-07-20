"""
auth.py
-------
Password hashing (bcrypt) + JWT creation/verification.

Provides three flavors of "who is calling this endpoint" dependency:
  - get_current_user       -> either a staff User or a Customer (generic)
  - get_current_staff_user -> must be a staff User (admin or cashier)
  - get_current_customer   -> must be a logged-in Customer
  - require_role(...)      -> role-based access control on top of staff auth

Also handles secure random token generation for email verification /
password reset, and server-side JWT logout via a blacklist table.
"""

import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# tokenUrl just tells Swagger UI where the login form should POST to
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# Secure random tokens (email verification / password reset)
# ---------------------------------------------------------------------------
def generate_secure_token() -> str:
    return secrets.token_urlsafe(32)


# ---------------------------------------------------------------------------
# JWT access tokens
# ---------------------------------------------------------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "jti": secrets.token_hex(16)})
    return jwt.encode(to_encode, settings.SECRET, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise credentials_exception


def blacklist_token(payload: dict, db: Session) -> None:
    """Called on logout - records the token's jti so it can never be reused,
    even though it hasn't technically expired yet."""
    jti = payload.get("jti")
    exp = payload.get("exp")
    if not jti or not exp:
        return
    already = db.query(models.TokenBlacklist).filter(models.TokenBlacklist.jti == jti).first()
    if already:
        return
    db.add(
        models.TokenBlacklist(
            jti=jti,
            expires_at=datetime.utcfromtimestamp(exp),
        )
    )
    db.commit()


def _is_blacklisted(jti: Optional[str], db: Session) -> bool:
    if not jti:
        return False
    return (
        db.query(models.TokenBlacklist).filter(models.TokenBlacklist.jti == jti).first()
        is not None
    )


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------
def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    """
    Generic 'who is this' dependency - works for BOTH staff and customer
    tokens, since each JWT carries a "type" claim ("staff" | "customer").
    Returns either a models.User or a models.Customer instance.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if _is_blacklisted(payload.get("jti"), db):
        raise HTTPException(status_code=401, detail="Token has been revoked. Please log in again.")

    username: str = payload.get("sub")
    token_type: str = payload.get("type", "staff")
    if username is None:
        raise credentials_exception

    if token_type == "customer":
        user = db.query(models.Customer).filter(models.Customer.email == username).first()
    else:
        user = db.query(models.User).filter(models.User.username == username).first()

    if user is None:
        raise credentials_exception
    if hasattr(user, "is_active") and not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been disabled")
    return user


def get_current_staff_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    """Strict version: rejects customer tokens outright. Use this on every
    admin/cashier-only route (products, suppliers, dashboard, etc.)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if _is_blacklisted(payload.get("jti"), db):
        raise HTTPException(status_code=401, detail="Token has been revoked. Please log in again.")

    if payload.get("type", "staff") != "staff":
        raise HTTPException(status_code=403, detail="Staff account required for this action")

    username: str = payload.get("sub")
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been disabled")
    return user


def require_admin(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    """Only admin users can access this. Rejects cashiers, customers, etc."""
    user = get_current_staff_user(token, db)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def get_current_customer(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.Customer:
    """For the customer-facing storefront (cart, wishlist, orders, reviews).
    Accepts BOTH customer and staff tokens. If a staff user is logged in,
    a Customer record is auto-created/linked using their email so they can
    use the storefront without needing a separate customer account."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if _is_blacklisted(payload.get("jti"), db):
        raise HTTPException(status_code=401, detail="Token has been revoked. Please log in again.")

    token_type = payload.get("type")
    sub: str = payload.get("sub")
    if not sub:
        raise credentials_exception

    # Customer token — look up directly
    if token_type == "customer":
        customer = db.query(models.Customer).filter(models.Customer.email == sub).first()
        if customer is None:
            raise credentials_exception
        if not customer.is_active:
            raise HTTPException(status_code=403, detail="This account has been disabled")
        return customer

    # Staff token — find or auto-create a linked Customer record
    staff_user = db.query(models.User).filter(models.User.username == sub).first()
    if staff_user is None:
        raise credentials_exception
    if not staff_user.is_active:
        raise HTTPException(status_code=403, detail="This account has been disabled")

    customer = db.query(models.Customer).filter(models.Customer.email == staff_user.email).first()
    if customer is None:
        customer = models.Customer(
            name=staff_user.username,
            email=staff_user.email,
            phone=None,
            hashed_password="",
            is_active=True,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    return customer


def require_role(*allowed_roles: str):
    """
    Role-based access control, layered on top of get_current_staff_user.

    Usage:
        @router.delete(...)
        def delete_x(current_user: models.User = Depends(require_role("admin"))):
            ...
    Only users whose `role` is in allowed_roles may proceed; everyone
    else gets a 403. Staff auth (valid token, active account) is still
    required first.
    """

    def dependency(current_user: models.User = Depends(get_current_staff_user)) -> models.User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return dependency
