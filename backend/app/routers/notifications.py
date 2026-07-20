"""
routers/notifications.py
---------------------------
MODULE 19 - NOTIFICATIONS

In-app notification feed (dashboard bell icon). Records are created by
other routers at the relevant trigger points:
    - low_stock          -> routers/inventory.py, after any stock update
    - purchase_success   -> routers/purchases.py, after committing a bill
    - order_success       -> routers/sales.py, after a sale is created
    - invoice_uploaded    -> routers/purchases.py, after an OCR scan
    - expiry_alert        -> could be run on a schedule (see note below)

Actual EMAIL delivery for these same events goes through
utils/email.py (send_email) - see each trigger point for the paired
send_email(...) call.

Note on scheduling: expiry_alert notifications ideally run once a day
via a cron job / scheduled task calling a script that checks
Product.expiry_date. This starter doesn't include a scheduler (adding
APScheduler or Celery is out of scope for a single response) - for now,
call GET /dashboard/expiry-status from the frontend on dashboard load,
which achieves the same visibility without a background job.
"""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_staff_user
from app.database import get_db

router = APIRouter(prefix="/notifications", tags=["Notifications"], dependencies=[Depends(get_current_staff_user)])


@router.get("", response_model=List[schemas.NotificationOut])
def list_notifications(unread_only: bool = False, limit: int = 30, db: Session = Depends(get_db)):
    query = db.query(models.Notification)
    if unread_only:
        query = query.filter(models.Notification.is_read == False)  # noqa: E712
    return query.order_by(models.Notification.created_at.desc()).limit(limit).all()


@router.post("/{notification_id}/read", response_model=schemas.NotificationOut)
def mark_read(notification_id: int, db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if notif:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db)):
    db.query(models.Notification).filter(models.Notification.is_read == False).update(  # noqa: E712
        {"is_read": True}
    )
    db.commit()
    return {"message": "All notifications marked as read"}
