"""Satellite field health API."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..providers import satellite
from ..providers import weather as weather_provider
from ..security import get_current_user, resolve_farmer
from ..services.field_health import interpret

router = APIRouter(prefix="/api", tags=["satellite"])


@router.get("/satellite")
def field_health(farmer_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farmer = resolve_farmer(db, user, farmer_id)
    farm = farmer.farm
    if farm is None or farm.latitude is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Set your farm location first")
    wx = weather_provider.get_forecast(db, farm.latitude, farm.longitude)
    res = satellite.get_field_health(farm.latitude, farm.longitude, weather=wx.data)
    data = interpret(res.data) if res.mode == "live" else {"estimate": res.data["estimate"]}
    return {"mode": res.mode, "source": res.source, "note": res.note, "crop": farm.current_crop,
            "location": {"lat": farm.latitude, "lon": farm.longitude}, "data": data}
