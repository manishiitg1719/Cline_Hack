"""Village Disease Radar: turn many farmers' scans into early outbreak warnings.

1. Take shared, confident disease scans from the last 7 days (healthy scans ignored).
2. Per disease, one point per FARM (a farm scanning 10 times still counts once).
3. DBSCAN (haversine) groups farms within ~5 km of each other into clusters.
4. Weather risk at the cluster centre (next 3 days) + number of farms ⇒ level watch / warning / outbreak.
5. Warning/outbreak ⇒ alert farmers growing that crop within (radius + 5 km), plus their helpers,
   once per outbreak level per week, in each person's language.
"""
from __future__ import annotations

import logging
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import numpy as np
from sklearn.cluster import DBSCAN
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..models import Farm, Outbreak, Scan
from ..providers import weather as weather_provider
from . import alerts
from .disease_risk import label_crop, weather_risk

log = logging.getLogger("farmguard.radar")

WINDOW_DAYS = 7
CLUSTER_KM = 5.0
ALERT_BUFFER_KM = 5.0
MIN_FARMS = 2
EARTH_KM = 6371.0
SEVERITY = {"warning": "warning", "outbreak": "danger"}

_last_run: dict = {}


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_KM * math.asin(math.sqrt(a))


def level_for(farms: int, risk: str) -> str:
    if farms >= 8 or (farms >= 5 and risk == "high"):
        return "outbreak"
    if farms >= 5 or (farms >= 3 and risk in ("medium", "high")):
        return "warning"
    return "watch"


def _recent_disease_scans(db: Session, now: datetime) -> list[Scan]:
    since = now - timedelta(days=WINDOW_DAYS)
    rows = db.scalars(
        select(Scan).where(Scan.shared.is_(True), Scan.scanned_at >= since, Scan.lat_grid.is_not(None))
    ).all()
    return [s for s in rows if not s.disease.endswith("healthy")]


def find_clusters(scans: list[Scan]) -> list[dict]:
    """Pure clustering step (no DB writes)."""
    by_disease: dict[str, dict[int, list[Scan]]] = defaultdict(lambda: defaultdict(list))
    for s in scans:
        by_disease[s.disease][s.farmer_id].append(s)

    clusters = []
    for disease, farms in by_disease.items():
        if len(farms) < MIN_FARMS:
            continue
        farm_ids = list(farms)
        pts = np.array([[np.mean([s.lat_grid for s in farms[f]]), np.mean([s.lon_grid for s in farms[f]])] for f in farm_ids])
        demo = [all(s.is_demo for s in farms[f]) for f in farm_ids]
        labels = DBSCAN(eps=CLUSTER_KM / EARTH_KM, min_samples=MIN_FARMS, metric="haversine",
                        algorithm="ball_tree").fit(np.radians(pts)).labels_
        for cl in sorted(set(labels) - {-1}):
            idx = [i for i, lab in enumerate(labels) if lab == cl]
            clat, clon = float(pts[idx, 0].mean()), float(pts[idx, 1].mean())
            radius = max(1.0, max(haversine_km(clat, clon, *pts[i]) for i in idx))
            clusters.append({
                "disease": disease, "crop": label_crop(disease), "farms": len(idx),
                "center_lat": round(clat, 4), "center_lon": round(clon, 4), "radius_km": round(radius, 2),
                "is_demo": any(demo[i] for i in idx),
            })
    return clusters


def _alert_farmers(db: Session, o: Outbreak, risk: str, week: str) -> int:
    if o.level not in SEVERITY:
        return 0
    sent = 0
    farms = db.scalars(select(Farm).where(Farm.current_crop == o.crop, Farm.latitude.is_not(None))).all()
    for farm in farms:
        dist = haversine_km(o.center_lat, o.center_lon, farm.latitude, farm.longitude)
        if dist > o.radius_km + ALERT_BUFFER_KM:
            continue
        alert = {
            "template_id": "radar_outbreak", "severity": SEVERITY[o.level],
            "key": f"{o.disease}:{o.center_lat:.1f},{o.center_lon:.1f}:{week}:{o.level}",
            "params": {"disease": o.disease, "farms": o.farm_count, "radius": math.ceil(dist + o.radius_km),
                       "risk": risk, "crop": o.crop},
        }
        sent += alerts.dispatch(db, farm.owner, [alert], "radar")
    return sent


def analyze(db: Session, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    clusters = find_clusters(_recent_disease_scans(db, now))
    db.execute(update(Outbreak).where(Outbreak.active.is_(True)).values(active=False))
    db.commit()

    week = f"{now.isocalendar().year}-W{now.isocalendar().week:02d}"
    created, alerts_sent, modes = [], 0, set()
    for c in clusters:
        wx = weather_provider.get_forecast(db, c["center_lat"], c["center_lon"])
        modes.add(wx.mode)
        risk = weather_risk(c["disease"], wx.data["days"])["risk"] if wx.data else "unknown"
        level = level_for(c["farms"], risk)
        o = Outbreak(crop=c["crop"], disease=c["disease"], center_lat=c["center_lat"], center_lon=c["center_lon"],
                     radius_km=c["radius_km"], farm_count=c["farms"], weather_risk=risk, level=level,
                     is_demo=c["is_demo"], active=True, detected_at=now)
        db.add(o)
        db.commit()
        db.refresh(o)
        alerts_sent += _alert_farmers(db, o, risk, week)
        created.append(o)

    summary = {
        "ran_at": now.isoformat(), "outbreaks": len(created), "alerts_sent": alerts_sent,
        "levels": {lv: sum(1 for o in created if o.level == lv) for lv in ("watch", "warning", "outbreak")},
        "weather_mode": "live" if modes == {"live"} else ("fallback" if modes else None),
    }
    _last_run.clear()
    _last_run.update(summary)
    log.info("radar analysis: %s", summary)
    return summary


def last_run() -> dict:
    return dict(_last_run)
