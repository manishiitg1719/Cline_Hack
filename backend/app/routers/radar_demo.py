"""Demo data for the Radar (for judging / testing). Everything created here has is_demo=True,
is shown with a "DEMO DATA" label in the app and can be removed with one call."""
from __future__ import annotations

import math
import random
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Outbreak, Scan, User
from ..security import get_current_user, hash_password
from ..services.disease_risk import disease_labels, label_crop
from .radar import farm_location
from .scans import to_grid

router = APIRouter(prefix="/api/radar/demo", tags=["radar"])

DEMO_PHONE_PREFIX = "+00demo"  # can never collide with real phone numbers (registration requires digits)
KM_PER_DEG = 111.0


class DemoSeedIn(BaseModel):
    disease: str = "Potato___Late_blight"
    farms: int = Field(default=6, ge=2, le=30)
    spread_km: float = Field(default=3.0, gt=0, le=10)


def _demo_user(db: Session, n: int) -> User:
    phone = f"{DEMO_PHONE_PREFIX}{n:03d}"
    u = db.scalar(select(User).where(User.phone == phone))
    if u is None:
        u = User(name=f"Demo farmer {n}", phone=phone, password_hash=hash_password(uuid.uuid4().hex),
                 role="farmer", language="hi")
        db.add(u)
        db.flush()
    return u


@router.post("/seed")
def demo_seed(body: DemoSeedIn, farmer_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Add DEMO disease scans from fake farms scattered within `spread_km` of your farm."""
    if body.disease not in disease_labels():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown disease label")
    _, lat, lon = farm_location(db, user, farmer_id)
    rnd = random.Random()
    now = datetime.now(timezone.utc)
    for i in range(body.farms):
        demo = _demo_user(db, i + 1)
        dist = rnd.uniform(0.3, body.spread_km) / KM_PER_DEG
        angle = rnd.uniform(0, 2 * math.pi)
        db.add(Scan(
            client_id=f"demo-{uuid.uuid4().hex}", farmer_id=demo.id, crop=label_crop(body.disease),
            disease=body.disease, confidence=round(rnd.uniform(0.75, 0.99), 3),
            lat_grid=to_grid(lat + dist * math.sin(angle)), lon_grid=to_grid(lon + dist * math.cos(angle)),
            shared=True, is_demo=True, scanned_at=now - timedelta(hours=rnd.uniform(1, 72)),
        ))
    db.commit()
    return {"seeded": body.farms, "disease": body.disease}


@router.delete("")
def demo_clear(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    removed = db.execute(delete(Scan).where(Scan.is_demo.is_(True))).rowcount
    db.execute(delete(Outbreak).where(Outbreak.is_demo.is_(True)))
    db.commit()
    return {"removed_scans": removed}
