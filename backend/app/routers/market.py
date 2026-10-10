"""Schemes (static, EN/HI) + marketplace: equipment rental and crop-waste exchange listings."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Listing, User
from ..security import get_current_user
from ..services import messages
from ..services.radar import haversine_km

router = APIRouter(prefix="/api", tags=["market"])
SCHEMES_FILE = Path(__file__).resolve().parents[3] / "shared" / "schemes" / "schemes.json"
EQUIPMENT = ("tractor", "harvester", "rotavator", "seeder", "sprayer", "thresher", "pump", "other")
WASTE = ("straw", "husk", "stalks", "dung", "bagasse", "other")
Kind = Literal["equipment", "waste"]


@lru_cache
def _schemes() -> dict:
    return json.loads(SCHEMES_FILE.read_text(encoding="utf-8"))


@router.get("/schemes")
def schemes(language: Literal["en", "hi"] | None = None, user: User = Depends(get_current_user)):
    lang = language or (user.language if user.language in ("en", "hi") else "en")
    data = _schemes()
    return {"last_checked": data["last_checked"],
            "schemes": [{"id": s["id"], "icon": s["icon"], "url": s["url"], **s[lang]} for s in data["schemes"]]}


class ListingIn(BaseModel):
    kind: Kind
    category: str = Field(max_length=30)
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(default="", max_length=600)
    price: float | None = Field(default=None, ge=0, le=10_000_000)
    unit: Literal["hour", "day", "acre", "quintal", "tonne", "trolley", "free", ""] = ""


def _out(l: Listing, me: User, lat: float | None, lon: float | None) -> dict:
    dist = round(haversine_km(lat, lon, l.lat, l.lon), 1) if None not in (lat, lon, l.lat, l.lon) else None
    mine = l.owner_id == me.id
    text = f"🙏 Namaste {l.owner.name}, FarmGuard par aapka '{l.title}' dekha. Kya yeh abhi uplabdh hai?"
    return {"id": l.id, "kind": l.kind, "category": l.category, "title": l.title, "description": l.description,
            "price": l.price, "unit": l.unit, "village": l.village, "distance_km": dist, "mine": mine,
            "owner_name": l.owner.name, "created_at": l.created_at.isoformat(),
            "whatsapp": None if mine else messages.whatsapp_link(text, l.owner.phone),
            "phone": None if mine else l.owner.phone}


@router.get("/listings")
def list_listings(kind: Kind, category: str | None = None, max_km: float = 50, mine: bool = False,
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farm = user.farm
    lat, lon = (farm.latitude, farm.longitude) if farm else (None, None)
    q = select(Listing).where(Listing.kind == kind, Listing.active.is_(True))
    if category:
        q = q.where(Listing.category == category)
    if mine:
        q = q.where(Listing.owner_id == user.id)
    items = [_out(l, user, lat, lon) for l in db.scalars(q.order_by(Listing.created_at.desc()).limit(300)).all()]
    if not mine:
        items = [i for i in items if i["distance_km"] is None or i["distance_km"] <= max_km]
    items.sort(key=lambda i: (i["distance_km"] is None, i["distance_km"] or 0))
    return {"has_location": lat is not None, "items": items[:100]}


@router.post("/listings", status_code=status.HTTP_201_CREATED)
def create_listing(body: ListingIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    allowed = EQUIPMENT if body.kind == "equipment" else WASTE
    if body.category not in allowed:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"category must be one of {allowed}")
    farm = user.farm
    l = Listing(owner_id=user.id, **body.model_dump(), village=farm.village if farm else "",
                lat=farm.latitude if farm else None, lon=farm.longitude if farm else None)
    db.add(l)
    db.commit()
    db.refresh(l)
    return _out(l, user, l.lat, l.lon)


@router.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(listing_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    l = db.get(Listing, listing_id)
    if l is None or l.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    db.delete(l)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
