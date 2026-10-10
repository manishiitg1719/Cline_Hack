"""Weather forecast + irrigation advice for the farmer's field."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Farm, User
from ..providers import weather as weather_provider
from ..security import get_current_user, resolve_farmer
from ..services import alerts, irrigation

router = APIRouter(prefix="/api", tags=["weather"])


def _farm_with_location(db: Session, farmer: User) -> Farm:
    farm = farmer.farm
    if farm is None or farm.latitude is None or farm.longitude is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Set your farm location first")
    return farm


@router.get("/weather")
def get_weather(farmer_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farmer = resolve_farmer(db, user, farmer_id)
    farm = _farm_with_location(db, farmer)
    result = weather_provider.get_forecast(db, farm.latitude, farm.longitude)
    env = result.envelope()
    if result.data:
        found = alerts.weather_alerts(result.data)
        env["alerts"] = found
        env["alerts_sent"] = alerts.dispatch(db, farmer, found, "weather")
    else:
        env["alerts"] = []
    return env


@router.get("/irrigation")
def get_irrigation(farmer_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farmer = resolve_farmer(db, user, farmer_id)
    farm = _farm_with_location(db, farmer)
    wx = weather_provider.get_forecast(db, farm.latitude, farm.longitude)
    if wx.data is None:
        return {"mode": wx.mode, "source": wx.source, "note": wx.note, "data": None}
    advice = irrigation.decide(wx.data, farm.current_crop, farm.soil_type, farm.water_source, farm.area_acres)
    alert = alerts.irrigation_alert(advice, wx.data["days"][0]["date"])
    sent = alerts.dispatch(db, farmer, [alert], "irrigation") if alert else 0
    return {"mode": wx.mode, "source": wx.source, "note": wx.note, "data": advice,
            "alert": alert, "alert_sent": bool(sent)}
