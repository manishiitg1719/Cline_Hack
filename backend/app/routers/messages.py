"""Quick Message Center: templates, rendering, contacts and in-app notifications."""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Contact, Notification, User
from ..schemas import ContactIn, ContactOut, NotificationOut
from ..security import get_current_user
from ..services import messages

router = APIRouter(prefix="/api", tags=["messages"])


# ---------- templates ----------
class RenderIn(BaseModel):
    template_id: str
    params: dict = {}
    language: Literal["en", "hi"] = "hi"
    phone: str | None = Field(default=None, max_length=20)


@router.get("/messages/templates")
def list_templates():
    return messages.catalog()


@router.post("/messages/render")
def render_message(body: RenderIn):
    try:
        text = messages.render(body.template_id, body.params, body.language)
    except KeyError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown template") from None
    return {
        "text": text,
        "title": messages.title(body.template_id, body.language),
        "whatsapp": messages.whatsapp_link(text, body.phone),
        "sms": messages.sms_link(text, body.phone),
    }


# ---------- contacts ----------
@router.get("/contacts", response_model=list[ContactOut])
def list_contacts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Contact).where(Contact.owner_id == user.id).order_by(Contact.category, Contact.name)).all()


@router.post("/contacts", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def add_contact(body: ContactIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contact = Contact(owner_id=user.id, **body.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def _own_contact(db: Session, user: User, contact_id: int) -> Contact:
    contact = db.get(Contact, contact_id)
    if contact is None or contact.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found")
    return contact


@router.put("/contacts/{contact_id}", response_model=ContactOut)
def edit_contact(contact_id: int, body: ContactIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contact = _own_contact(db, user, contact_id)
    for k, v in body.model_dump().items():
        setattr(contact, k, v)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(_own_contact(db, user, contact_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- notifications ----------
def _with_text(n: Notification, lang: str) -> dict:
    out = NotificationOut.model_validate(n).model_dump()
    try:
        out["title"] = messages.title(n.template_id, lang)
        out["text"] = messages.render(n.template_id, n.params, lang)
    except KeyError:
        out["title"], out["text"] = n.kind, ""
    return out


@router.get("/notifications")
def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        q = q.where(Notification.is_read.is_(False))
    items = db.scalars(q.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(min(limit, 200))).all()
    unread = db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read.is_(False)).count()
    return {"unread": unread, "items": [_with_text(n, user.language) for n in items]}


@router.post("/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, notification_id)
    if n is None or n.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    n.is_read = True
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.execute(update(Notification).where(Notification.user_id == user.id).values(is_read=True))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
