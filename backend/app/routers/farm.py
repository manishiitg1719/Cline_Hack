"""Farm profile (farmer edits own; linked helpers view / edit with permission)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Farm, User
from ..schemas import FarmIn, FarmOut
from ..security import get_current_user, resolve_farmer

router = APIRouter(prefix="/api/farm", tags=["farm"])


def _get_or_create(db: Session, farmer: User) -> Farm:
    if farmer.farm is None:
        farmer.farm = Farm()
        db.commit()
        db.refresh(farmer)
    return farmer.farm


@router.get("", response_model=FarmOut)
def get_farm(farmer_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farmer = resolve_farmer(db, user, farmer_id)
    return _get_or_create(db, farmer)


@router.put("", response_model=FarmOut)
def update_farm(
    body: FarmIn,
    farmer_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    farmer = resolve_farmer(db, user, farmer_id, need_edit=True)
    farm = _get_or_create(db, farmer)
    data = body.model_dump()
    data["past_crops"] = [c.strip().lower() for c in data["past_crops"] if c.strip()][:10]
    data["current_crop"] = data["current_crop"].strip().lower()
    for key, value in data.items():
        setattr(farm, key, value)
    db.commit()
    db.refresh(farm)
    return farm
