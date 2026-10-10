"""Weather: Open-Meteo (LIVE, free, no key) → last cached forecast (FALLBACK)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import WeatherCache
from .base import ProviderResult
from .registry import get_provider

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
FRESH_FOR = timedelta(minutes=30)  # reuse a recent live forecast instead of calling again

DAILY = [
    "weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_sum",
    "precipitation_probability_max", "wind_speed_10m_max", "et0_fao_evapotranspiration",
]
HOURLY = ["relative_humidity_2m", "temperature_2m", "precipitation_probability", "soil_moisture_3_to_9cm"]
CURRENT = ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "weather_code", "precipitation"]


def grid_key(lat: float, lon: float) -> str:
    return f"{round(lat, 2):.2f},{round(lon, 2):.2f}"


def _fetch_open_meteo(lat: float, lon: float) -> dict:
    params = {
        "latitude": lat, "longitude": lon, "timezone": "auto", "forecast_days": 7,
        "daily": ",".join(DAILY), "hourly": ",".join(HOURLY), "current": ",".join(CURRENT),
    }
    r = httpx.get(OPEN_METEO_URL, params=params, timeout=15)
    r.raise_for_status()
    return normalize(r.json())


def normalize(raw: dict) -> dict:
    """Reduce Open-Meteo's response to the compact shape the app uses."""
    d, h = raw["daily"], raw["hourly"]
    days = []
    for i, date in enumerate(d["time"]):
        hours = range(i * 24, min((i + 1) * 24, len(h["time"])))
        hum = [h["relative_humidity_2m"][j] for j in hours if h["relative_humidity_2m"][j] is not None]
        temps = [h["temperature_2m"][j] for j in hours if h["temperature_2m"][j] is not None]
        days.append({
            "date": date,
            "code": d["weather_code"][i],
            "t_max": d["temperature_2m_max"][i],
            "t_min": d["temperature_2m_min"][i],
            "rain_mm": d["precipitation_sum"][i] or 0.0,
            "rain_prob": d["precipitation_probability_max"][i] or 0,
            "wind_max": d["wind_speed_10m_max"][i],
            "et0": d["et0_fao_evapotranspiration"][i],
            # for disease-risk rules (Radar, Phase 6)
            "humid_hours": sum(1 for x in hum if x >= 90),
            "t_mean": round(sum(temps) / len(temps), 1) if temps else None,
        })
    soil = [x for x in h.get("soil_moisture_3_to_9cm", []) if x is not None]
    now_hour = raw["current"]["time"][:13]
    idx = next((i for i, t in enumerate(h["time"]) if t.startswith(now_hour)), 0)
    soil_now = h["soil_moisture_3_to_9cm"][idx] if soil else None
    next24 = h["precipitation_probability"][idx : idx + 24]
    c = raw["current"]
    return {
        "current": {
            "time": c["time"], "temp": c["temperature_2m"], "humidity": c["relative_humidity_2m"],
            "wind": c["wind_speed_10m"], "code": c["weather_code"], "rain_mm": c["precipitation"],
        },
        "soil_moisture": soil_now,  # m³/m³ (volumetric, 0-1)
        "rain_prob_24h": max((p for p in next24 if p is not None), default=0),
        "days": days,
        "timezone": raw.get("timezone", ""),
    }


def get_forecast(db: Session, lat: float, lon: float, fetcher=None) -> ProviderResult:
    """LIVE from Open-Meteo when possible; otherwise last saved forecast (FALLBACK)."""
    fetcher = fetcher or _fetch_open_meteo  # looked up at call time (patchable in tests)
    provider = get_provider("weather")
    key = grid_key(lat, lon)
    cached = db.scalar(select(WeatherCache).where(WeatherCache.grid_key == key))
    now = datetime.now(timezone.utc)

    def age(c: WeatherCache) -> timedelta:
        fetched = c.fetched_at if c.fetched_at.tzinfo else c.fetched_at.replace(tzinfo=timezone.utc)
        return now - fetched

    live_ok, reason = provider.is_live()
    if live_ok:
        if cached and age(cached) < FRESH_FOR:
            return provider.live({**cached.payload, "fetched_at": cached.fetched_at.isoformat()})
        try:
            data = fetcher(lat, lon)
            if cached:
                cached.payload, cached.fetched_at = data, now
            else:
                db.add(WeatherCache(grid_key=key, payload=data, fetched_at=now))
            db.commit()
            return provider.live({**data, "fetched_at": now.isoformat()})
        except Exception as exc:  # network down, HTTP error, bad payload
            provider.mark_error(f"{type(exc).__name__}: {exc}")
            reason = "Open-Meteo unreachable"

    if cached:
        hours = int(age(cached).total_seconds() // 3600)
        return provider.fallback(
            {**cached.payload, "fetched_at": cached.fetched_at.isoformat(), "stale_hours": hours},
            note=f"{reason}. Showing forecast saved {hours} h ago.",
        )
    return provider.fallback(None, note=f"{reason}. No saved forecast for this location yet.")
