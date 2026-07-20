"""
routers/auth.py
----------------
MODULE 1 - LOGIN

Staff (admin/cashier):
    POST /auth/register            create a staff account
    POST /auth/login               staff login (OAuth2 form, works with Swagger's Authorize button)
    POST /auth/logout              blacklist the current token

Customer (storefront):
    POST /auth/customer/register   customer self-registration
    POST /auth/customer/login      customer login (JSON body)
    POST /auth/customer/logout     blacklist the current token

Shared:
    POST /auth/forgot-password     request a reset link (staff or customer)
    POST /auth/reset-password      consume the reset token, set new password
    POST /auth/verify-email        consume the verification token
    POST /auth/resend-verification re-send the verification email
    GET  /auth/me                  return whoever the current token belongs to
"""

from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models, schemas, auth
from app.config import settings
from app.database import get_db
from app.middleware import limiter
from app.utils.email import send_verification_email, send_password_reset_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ===========================================================================
# STAFF (admin / cashier)
# ===========================================================================
@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    existing = db.query(models.User).filter(
        (models.User.username == user_in.username) | (models.User.email == user_in.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    token = auth.generate_secure_token()
    new_user = models.User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=auth.hash_password(user_in.password),
        role=user_in.role,
        verification_token=token,
        verification_token_expires=datetime.utcnow()
        + timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    send_verification_email(new_user.email, new_user.username, token, settings.FRONTEND_ORIGIN)
    return new_user


@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Uses the standard OAuth2 'password' flow so this endpoint works
    directly with Swagger UI's built-in "Authorize" button.
    """
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been disabled. Contact an admin.")

    access_token = auth.create_access_token(data={"sub": user.username, "type": "staff", "role": user.role})
    return schemas.Token(
        access_token=access_token,
        user_type="staff",
        user=schemas.UserOut.model_validate(user).model_dump(mode="json"),
    )


@router.post("/logout", response_model=schemas.MessageResponse)
def logout(
    token: str = Depends(auth.oauth2_scheme),
    db: Session = Depends(get_db),
):
    payload = auth.decode_token(token)
    auth.blacklist_token(payload, db)
    return schemas.MessageResponse(message="Logged out successfully")


# ===========================================================================
# CUSTOMER (storefront)
# ===========================================================================
@router.post(
    "/customer/register", response_model=schemas.CustomerOut, status_code=status.HTTP_201_CREATED
)
def customer_register(payload: schemas.CustomerRegister, db: Session = Depends(get_db)):
    existing = db.query(models.Customer).filter(models.Customer.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    if payload.phone:
        phone_match = db.query(models.Customer).filter(models.Customer.phone == payload.phone).first()
        if phone_match:
            raise HTTPException(status_code=400, detail="An account with this phone number already exists")

    token = auth.generate_secure_token()
    customer = models.Customer(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        hashed_password=auth.hash_password(payload.password),
        verification_token=token,
        verification_token_expires=datetime.utcnow()
        + timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS),
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    try:
        send_verification_email(customer.email, customer.name, token, settings.FRONTEND_ORIGIN)
    except Exception:
        pass  # don't let email failure block registration

    return customer


@router.post("/customer/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def customer_login(request: Request, payload: schemas.CustomerLogin, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.email == payload.email).first()
    if not customer or not auth.verify_password(payload.password, customer.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not customer.is_active:
        raise HTTPException(status_code=403, detail="This account has been disabled")

    access_token = auth.create_access_token(data={"sub": customer.email, "type": "customer"})
    return schemas.Token(
        access_token=access_token,
        user_type="customer",
        user=schemas.CustomerOut.model_validate(customer).model_dump(mode="json"),
    )


@router.post("/customer/google", response_model=schemas.Token)
def customer_google_login(
    payload: schemas.GoogleLoginRequest,
    db: Session = Depends(get_db),
):
    """Login or register a customer using their Google ID token."""
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    try:
        idinfo = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = idinfo.get("email")
    name = idinfo.get("name", "")
    picture = idinfo.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="Could not get email from Google account")

    customer = db.query(models.Customer).filter(models.Customer.email == email).first()
    if customer:
        if not customer.is_active:
            raise HTTPException(status_code=403, detail="This account has been disabled")
        if not customer.name and name:
            customer.name = name
            db.commit()
    else:
        customer = models.Customer(
            name=name,
            email=email,
            hashed_password=auth.hash_password(auth.generate_secure_token()),
            is_verified=True,
            is_active=True,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    access_token = auth.create_access_token(data={"sub": customer.email, "type": "customer"})
    return schemas.Token(
        access_token=access_token,
        user_type="customer",
        user=schemas.CustomerOut.model_validate(customer).model_dump(mode="json"),
    )


@router.post("/customer/logout", response_model=schemas.MessageResponse)
def customer_logout(
    token: str = Depends(auth.oauth2_scheme),
    db: Session = Depends(get_db),
):
    payload = auth.decode_token(token)
    auth.blacklist_token(payload, db)
    return schemas.MessageResponse(message="Logged out successfully")


# ===========================================================================
# SHARED: forgot password / reset password / email verification
# ===========================================================================
def _account_model(account_type: str):
    return models.User if account_type == "staff" else models.Customer


def _account_email_field(account_type: str):
    # staff logs in with username but still has an email column
    return "email"


@router.post("/forgot-password", response_model=schemas.MessageResponse)
@limiter.limit("3/minute")
def forgot_password(request: Request, payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    Model = _account_model(payload.account_type)
    account = db.query(Model).filter(Model.email == payload.email).first()

    # Always return the same generic message, whether or not the account
    # exists - this prevents attackers from using this endpoint to find
    # out which emails are registered ("account enumeration").
    generic_message = schemas.MessageResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )

    if not account:
        return generic_message

    token = auth.generate_secure_token()
    account.reset_token = token
    account.reset_token_expires = datetime.utcnow() + timedelta(
        minutes=settings.RESET_TOKEN_EXPIRE_MINUTES
    )
    db.commit()

    name = getattr(account, "name", None) or getattr(account, "username", "there")
    send_password_reset_email(account.email, name, token, settings.FRONTEND_ORIGIN)

    if settings.DEV_EXPOSE_TOKENS:
        generic_message.dev_token = token  # dev/testing convenience only
    return generic_message


@router.post("/reset-password", response_model=schemas.MessageResponse)
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    Model = _account_model(payload.account_type)
    account = db.query(Model).filter(Model.reset_token == payload.token).first()

    if not account or not account.reset_token_expires or account.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    account.hashed_password = auth.hash_password(payload.new_password)
    account.reset_token = None
    account.reset_token_expires = None
    db.commit()

    return schemas.MessageResponse(message="Password has been reset successfully. You can now log in.")


@router.post("/verify-email", response_model=schemas.MessageResponse)
def verify_email(payload: schemas.VerifyEmailRequest, db: Session = Depends(get_db)):
    Model = _account_model(payload.account_type)
    account = db.query(Model).filter(Model.verification_token == payload.token).first()

    if (
        not account
        or not account.verification_token_expires
        or account.verification_token_expires < datetime.utcnow()
    ):
        raise HTTPException(status_code=400, detail="This verification link is invalid or has expired")

    account.is_verified = True
    account.verification_token = None
    account.verification_token_expires = None
    db.commit()

    return schemas.MessageResponse(message="Email verified successfully. You can now log in.")


@router.post("/resend-verification", response_model=schemas.MessageResponse)
def resend_verification(payload: schemas.ResendVerificationRequest, db: Session = Depends(get_db)):
    Model = _account_model(payload.account_type)
    account = db.query(Model).filter(Model.email == payload.email).first()

    generic_message = schemas.MessageResponse(
        message="If an account with that email exists and isn't verified yet, a new link has been sent."
    )
    if not account or account.is_verified:
        return generic_message

    token = auth.generate_secure_token()
    account.verification_token = token
    account.verification_token_expires = datetime.utcnow() + timedelta(
        hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS
    )
    db.commit()

    name = getattr(account, "name", None) or getattr(account, "username", "there")
    send_verification_email(account.email, name, token, settings.FRONTEND_ORIGIN)

    if settings.DEV_EXPOSE_TOKENS:
        generic_message.dev_token = token
    return generic_message


# ===========================================================================
# "Who am I" - works for both staff and customer tokens
# ===========================================================================
@router.get("/me")
def me(current_user=Depends(auth.get_current_user)):
    if isinstance(current_user, models.User):
        return {"user_type": "staff", "user": schemas.UserOut.model_validate(current_user)}
    return {"user_type": "customer", "user": schemas.CustomerOut.model_validate(current_user)}


# ===========================================================================
# STAFF MANAGEMENT (admin only)
# ===========================================================================
@router.get("/users", response_model=List[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    return db.query(models.User).all()


@router.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.username:
        existing = db.query(models.User).filter(
            models.User.username == payload.username,
            models.User.user_id != user_id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

    update_data = payload.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = auth.hash_password(update_data.pop("password"))
    else:
        update_data.pop("password", None)

    for k, v in update_data.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


@router.put("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}
