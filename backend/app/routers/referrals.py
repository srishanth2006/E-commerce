"""
routers/referrals.py
---------------------
Referral program for customer growth.
"""
import secrets
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_customer
from app.database import get_db

router = APIRouter(prefix="/referrals", tags=["Referrals"])


@router.post("/generate", response_model=schemas.ReferralOut)
def generate_referral_code(
    db: Session = Depends(get_db),
    current_user: models.Customer = Depends(get_current_customer),
):
    existing = db.query(models.Referral).filter(
        models.Referral.referrer_id == current_user.customer_id
    ).first()
    if existing:
        return existing
    code = secrets.token_urlsafe(8).upper()
    referral = models.Referral(
        referrer_id=current_user.customer_id,
        referral_code=code,
        reward_points=50,
    )
    db.add(referral)
    db.commit()
    db.refresh(referral)
    return referral


@router.post("/apply/{code}")
def apply_referral(
    code: str,
    db: Session = Depends(get_db),
    current_user: models.Customer = Depends(get_current_customer),
):
    referral = db.query(models.Referral).filter(
        models.Referral.referral_code == code.upper(),
        models.Referral.is_claimed == False,  # noqa: E712
    ).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Invalid or already used referral code")
    if referral.referrer_id == current_user.customer_id:
        raise HTTPException(status_code=400, detail="Cannot use your own referral code")
    referral.referred_id = current_user.customer_id
    referral.is_claimed = True
    current_user.loyalty_points = (current_user.loyalty_points or 0) + referral.reward_points
    referrer = db.query(models.Customer).filter(models.Customer.customer_id == referral.referrer_id).first()
    if referrer:
        referrer.loyalty_points = (referrer.loyalty_points or 0) + referral.reward_points
    db.commit()
    return {"message": f"You earned {referral.reward_points} loyalty points!"}


@router.get("/my-code", response_model=schemas.ReferralOut)
def get_my_code(
    db: Session = Depends(get_db),
    current_user: models.Customer = Depends(get_current_customer),
):
    referral = db.query(models.Referral).filter(
        models.Referral.referrer_id == current_user.customer_id
    ).first()
    if not referral:
        raise HTTPException(status_code=404, detail="No referral code yet. Generate one first.")
    return referral
