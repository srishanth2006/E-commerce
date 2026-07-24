"""
routers/support.py
-------------------
Customer support ticket system.
- Customers can submit tickets from the Help Desk page.
- Staff/admin can view, reply to, and update ticket status.
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.auth import get_current_staff_user
from app.database import get_db
from app.routers.websocket import broadcast_sync

router = APIRouter(prefix="/support", tags=["Support"])


@router.post("/tickets", response_model=schemas.SupportTicketOut)
def create_ticket(
    payload: schemas.SupportTicketCreate,
    db: Session = Depends(get_db),
):
    """Anyone (logged in or not) can submit a support ticket."""
    try:
        ticket = models.SupportTicket(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            order_id=payload.order_id,
            subject=payload.subject,
            message=payload.message,
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
    except Exception as exc:
        import logging
        logging.error("Failed to create support ticket: %s", exc)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create ticket")

    try:
        broadcast_sync({
            "type": "notification",
            "data": {
                "id": ticket.id,
                "type": "support_ticket",
                "title": f"New support ticket #{ticket.id}",
                "message": f"{ticket.name}: {ticket.subject or 'No subject'}",
                "is_read": False,
                "created_at": str(ticket.created_at),
            },
        })
    except Exception:
        pass

    try:
        db.add(models.Notification(
            type="support_ticket",
            title=f"New support ticket #{ticket.id}",
            message=f"{ticket.name}: {ticket.subject or 'No subject'} — {ticket.message[:80]}",
        ))
        db.commit()
    except Exception:
        db.rollback()

    return ticket


@router.get("/tickets", response_model=List[schemas.SupportTicketOut])
def list_tickets(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    """Staff/admin: list all support tickets."""
    q = db.query(models.SupportTicket).order_by(models.SupportTicket.created_at.desc())
    if status:
        q = q.filter(models.SupportTicket.status == status)
    return q.all()


@router.get("/tickets/{ticket_id}", response_model=schemas.SupportTicketOut)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
):
    ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.get("/track")
def track_ticket(
    ticket_id: int,
    email: str = "",
    phone: str = "",
    db: Session = Depends(get_db),
):
    """Public: customer tracks their ticket by ID + email or phone for verification."""
    ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if email and ticket.email and ticket.email.lower() != email.lower():
        if phone and ticket.phone and phone != ticket.phone:
            raise HTTPException(status_code=403, detail="Email or phone does not match this ticket")
    if phone and ticket.phone and not email and phone != ticket.phone:
        raise HTTPException(status_code=403, detail="Phone does not match this ticket")
    return {
        "id": ticket.id,
        "name": ticket.name,
        "email": ticket.email,
        "phone": ticket.phone,
        "subject": ticket.subject,
        "message": ticket.message,
        "status": ticket.status,
        "admin_reply": ticket.admin_reply,
        "created_at": str(ticket.created_at),
        "updated_at": str(ticket.updated_at),
    }


@router.put("/tickets/{ticket_id}", response_model=schemas.SupportTicketOut)
def update_ticket(
    ticket_id: int,
    payload: schemas.SupportTicketReply,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    """Staff/admin: reply to and update status of a ticket."""
    ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.admin_reply = payload.admin_reply
    if payload.status:
        ticket.status = payload.status
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return ticket


@router.patch("/tickets/{ticket_id}/status", response_model=schemas.SupportTicketOut)
def update_ticket_status(
    ticket_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    """Staff/admin: quick status toggle."""
    valid = ["open", "in_progress", "resolved", "closed"]
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")
    ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = status
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return ticket


@router.delete("/tickets/{ticket_id}", status_code=204)
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff_user),
):
    ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    db.delete(ticket)
    db.commit()
