"""Weather & irrigation alerts → in-app notifications for farmer + helpers (once per day each)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models import AlertLog, User
from .notify import notify

HEAVY_RAIN_MM = 30.0     # IMD: "heavy rain" starts at 64.5 mm/day; 30 mm is a practical farm warning
HEAVY_RAIN_PROB = 60
HEATWAVE_C = 40.0        # IMD heatwave criterion for plains: max temp ≥ 40 °C (and departure)
STRONG_WIND_KMH = 40.0   # spraying unsafe well below this; 40 km/h = "strong breeze/near gale"


def weather_alerts(weather: dict) -> list[dict]:
    """Pure function: list of alerts (template_id, params, severity, key) from a forecast."""
    alerts = []
    for d in weather.get("days", [])[:3]:
        date = d["date"]
        if (d.get("rain_mm") or 0) >= HEAVY_RAIN_MM and (d.get("rain_prob") or 0) >= HEAVY_RAIN_PROB:
            alerts.append({"template_id": "weather_heavy_rain", "severity": "danger", "key": f"rain:{date}",
                           "params": {"date": date, "probability": d["rain_prob"]}})
        if (d.get("t_max") or 0) >= HEATWAVE_C:
            alerts.append({"template_id": "weather_heatwave", "severity": "warning", "key": f"heat:{date}",
                           "params": {"date": date, "temp": round(d["t_max"])}})
        if (d.get("wind_max") or 0) >= STRONG_WIND_KMH:
            alerts.append({"template_id": "weather_strong_wind", "severity": "warning", "key": f"wind:{date}",
                           "params": {"date": date, "speed": round(d["wind_max"])}})
    return alerts


def irrigation_alert(result: dict, date: str) -> dict | None:
    if result["decision"] == "irrigate":
        return {"template_id": "irrigation_now", "severity": "warning", "key": f"irrigate:{date}",
                "params": {"crop": result["crop"] or "", "moisture": result["soil_moisture_pct"] or "–",
                           "rain": result["rain_prob_24h"]}}
    if result["decision"] == "delay":
        return {"template_id": "irrigation_delay", "severity": "info", "key": f"delay:{date}",
                "params": {"rain": result["rain_prob_24h"]}}
    return None


def dispatch(db: Session, farmer: User, alerts: list[dict], kind: str) -> int:
    """Send each alert once (farmer + helpers). Returns how many were newly sent."""
    sent = 0
    for a in alerts:
        key = f"{kind}:{a['key']}"
        if db.scalar(select(AlertLog.id).where(AlertLog.farmer_id == farmer.id, AlertLog.alert_key == key)):
            continue
        db.add(AlertLog(farmer_id=farmer.id, alert_key=key))
        try:
            db.flush()
        except IntegrityError:  # concurrent request already logged it
            db.rollback()
            continue
        notify(db, farmer.id, kind, a["template_id"], a["params"], severity=a["severity"],
               include_helpers=True, commit=False)
        sent += 1
    db.commit()
    return sent
