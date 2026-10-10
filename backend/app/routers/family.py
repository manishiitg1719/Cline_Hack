"""Family Helper mode: link relatives by 6-digit code, permissions, Help-me button."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import HelperLink, User
from ..schemas import HelpRequestIn, LinkedPerson, LinkIn, LinkPermissionIn
from ..security import get_current_user
from ..services import messages
from ..services.notify import notify

router = APIRouter(prefix="/api/family", tags=["family"])


def _person(link: HelperLink, other: User) -> LinkedPerson:
    return LinkedPerson(
        link_id=link.id, user_id=other.id, name=other.name, phone=other.phone,
        language=other.language, relation=link.relation, can_edit=link.can_edit,
    )


@router.get("", response_model=list[LinkedPerson])
def list_links(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Farmer → their helpers. Helper → the farmers they help."""
    if user.role == "farmer":
        links = db.scalars(select(HelperLink).where(HelperLink.farmer_id == user.id)).all()
        return [_person(l, l.helper) for l in links]
    links = db.scalars(select(HelperLink).where(HelperLink.helper_id == user.id)).all()
    return [_person(l, l.farmer) for l in links]


@router.post("/link", response_model=LinkedPerson, status_code=status.HTTP_201_CREATED)
def link_with_code(body: LinkIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "helper":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only helpers can link to a farmer")
    farmer = db.scalar(select(User).where(User.link_code == body.code, User.role == "farmer"))
    if farmer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No farmer found with this code")
    existing = db.scalar(select(HelperLink).where(HelperLink.farmer_id == farmer.id, HelperLink.helper_id == user.id))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already linked to this farmer")
    link = HelperLink(farmer_id=farmer.id, helper_id=user.id, relation=body.relation.strip(), can_edit=False)
    db.add(link)
    db.commit()
    db.refresh(link)
    notify(db, farmer.id, "family", "custom", {"text": f"👨‍👩‍👦 {user.name} ({user.phone}) linked as your helper."})
    return _person(link, farmer)


def _farmer_link(db: Session, user: User, link_id: int) -> HelperLink:
    link = db.get(HelperLink, link_id)
    if link is None or user.id not in (link.farmer_id, link.helper_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link not found")
    return link


@router.patch("/{link_id}", response_model=LinkedPerson)
def set_permission(link_id: int, body: LinkPermissionIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    link = _farmer_link(db, user, link_id)
    if link.farmer_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the farmer can change permissions")
    link.can_edit = body.can_edit
    db.commit()
    db.refresh(link)
    return _person(link, link.helper)


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink(link_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Either side can remove the link."""
    db.delete(_farmer_link(db, user, link_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/help")
def help_me(body: HelpRequestIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Farmer taps 'Help me': notify every helper in-app and return ready WhatsApp links per helper."""
    if user.role != "farmer":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only farmers can request help")
    params = {"name": user.name, "issue": body.issue, "note": body.note.strip()}
    links = db.scalars(select(HelperLink).where(HelperLink.farmer_id == user.id)).all()
    for link in links:
        notify(db, link.helper_id, "help", "help_request", params, severity="warning", commit=False)
    db.commit()
    out = []
    for link in links:
        text = messages.render("help_request", params, link.helper.language)
        out.append({"helper_id": link.helper_id, "name": link.helper.name, "text": text,
                    "whatsapp": messages.whatsapp_link(text, link.helper.phone),
                    "sms": messages.sms_link(text, link.helper.phone)})
    return {"notified": len(links), "helpers": out}
