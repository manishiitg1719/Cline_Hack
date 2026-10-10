"""Village Disease Radar API: map data, nearby outbreaks, weather-only risk, run analysis."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Outbreak, Scan, User
from ..providers import weather as weather_provider
from ..security import get_current_user, resolve_farmer
from ..services import radar
from ..services.disease_risk import disease_labels, label_crop, weather_risk

router = APIRouter(prefix="/api/radar", tags=["radar"])
LEVEL_ORDER = {"outbreak": 0, "warning": 1, "watch": 2}


def farm_location(db: Session, user: User, farmer_id: int | None) -> tuple[User, float, float]:
    farmer = resolve_farmer(db, user, farmer_id)
    farm = farmer.farm
    if farm is None or farm.latitude is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Set your farm location first")
    return farmer, farm.latitude, farm.longitude


def _outbreak_out(o: Outbreak, lat: float, lon: float) -> dict:
    return {
        "id": o.id, "crop": o.crop, "disease": o.disease, "center_lat": o.center_lat, "center_lon": o.center_lon,
        "radius_km": o.radius_km, "farm_count": o.farm_count, "weather_risk": o.weather_risk, "level": o.level,
        "is_demo": o.is_demo, "detected_at": o.detected_at.isoformat(),
        "distance_km": round(radar.haversine_km(lat, lon, o.center_lat, o.center_lon), 1),
    }


@router.get("/map")
def radar_map(farmer_id: int | None = None, radius_km: float = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Anonymous case points (1 km grid, one per farm + disease) and active outbreaks near the farm."""
    _, lat, lon = farm_location(db, user, farmer_id)
    radius_km = min(max(radius_km, 1), 200)
    since = datetime.now(timezone.utc) - timedelta(days=radar.WINDOW_DAYS)
    scans = db.scalars(select(Scan).where(Scan.shared.is_(True), Scan.scanned_at >= since, Scan.lat_grid.is_not(None))).all()
    points: dict[tuple, dict] = {}
    for s in scans:
        if s.disease.endswith("healthy") or radar.haversine_km(lat, lon, s.lat_grid, s.lon_grid) > radius_km:
            continue
        # keyed per farm & disease, but no farmer identity is returned
        points[(s.farmer_id, s.disease)] = {"lat": s.lat_grid, "lon": s.lon_grid, "disease": s.disease,
                                            "crop": s.crop, "is_demo": s.is_demo}
    outbreaks = [o for o in db.scalars(select(Outbreak).where(Outbreak.active.is_(True))).all()
                 if radar.haversine_km(lat, lon, o.center_lat, o.center_lon) <= radius_km]
    return {
        "center": {"lat": lat, "lon": lon}, "radius_km": radius_km, "points": list(points.values()),
        "outbreaks": sorted((_outbreak_out(o, lat, lon) for o in outbreaks), key=lambda o: LEVEL_ORDER[o["level"]]),
        "last_run": radar.last_run(),
        "has_demo": any(p["is_demo"] for p in points.values()) or any(o.is_demo for o in outbreaks),
    }


@router.get("/near-me")
def near_me(farmer_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Active outbreaks close enough to matter, the farmer's own crop first."""
    farmer, lat, lon = farm_location(db, user, farmer_id)
    my_crop = farmer.farm.current_crop or ""
    items = []
    for o in db.scalars(select(Outbreak).where(Outbreak.active.is_(True))).all():
        if radar.haversine_km(lat, lon, o.center_lat, o.center_lon) <= o.radius_km + radar.ALERT_BUFFER_KM + 10:
            items.append({**_outbreak_out(o, lat, lon), "my_crop": o.crop == my_crop})
    items.sort(key=lambda i: (not i["my_crop"], LEVEL_ORDER[i["level"]], i["distance_km"]))
    return {"outbreaks": items}


@router.get("/weather-risk")
def weather_risk_for_crop(farmer_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Weather-only disease risk for the farmer's crop — works even with zero nearby reports (FALLBACK idea)."""
    farmer, lat, lon = farm_location(db, user, farmer_id)
    crop = farmer.farm.current_crop or ""
    wx = weather_provider.get_forecast(db, lat, lon)
    labels = [l for l in disease_labels() if label_crop(l) == crop]
    risks = []
    if wx.data:
        for l in labels:
            r = weather_risk(l, wx.data["days"])
            if r["rule"] != "not_weather":
                risks.append({"disease": l, **r})
        risks.sort(key=lambda r: {"high": 0, "medium": 1, "low": 2}[r["risk"]])
    return {"mode": wx.mode, "source": wx.source, "note": wx.note, "crop": crop, "supported": bool(labels), "risks": risks}


@router.post("/analyze")
def run_analysis(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Run outbreak detection now (it also runs automatically every hour)."""
    return radar.analyze(db)
