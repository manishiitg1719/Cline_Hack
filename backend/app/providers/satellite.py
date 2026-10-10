"""Satellite field health provider: Sentinel-2 via Planetary Computer (LIVE) → weather estimate (FALLBACK).
Cached 12 h per field (new scenes arrive about every 5 days)."""
from __future__ import annotations

import time

from .base import ProviderResult
from .registry import get_provider
from .sentinel import fetch_series

CACHE_TTL = 12 * 3600
_cache: dict[tuple, tuple[float, dict]] = {}


def weather_estimate(weather: dict | None) -> dict | None:
    """Rough crop water-condition score (0–100) from modelled soil moisture + 7-day rain vs evaporation."""
    if not weather:
        return None
    theta = weather.get("soil_moisture")
    days = weather.get("days", [])[:7]
    rain = sum(d.get("rain_mm") or 0 for d in days)
    et = sum(d.get("et0") or 0 for d in days)
    moisture = 50 if theta is None else max(0.0, min(100.0, (theta - 0.10) / 0.25 * 100))
    balance = max(0.0, min(100.0, 50 + (rain - et) * 2))
    return {"water_score": round(0.7 * moisture + 0.3 * balance), "soil_moisture": theta,
            "rain_7d": round(rain, 1), "et0_7d": round(et, 1)}


def get_field_health(lat: float, lon: float, weather: dict | None = None, fetcher=None) -> ProviderResult:
    provider = get_provider("satellite")
    fetcher = fetcher or fetch_series
    key = (round(lat, 4), round(lon, 4))
    live_ok, reason = provider.is_live()
    if live_ok:
        hit = _cache.get(key)
        if hit and time.time() - hit[0] < CACHE_TTL:
            return provider.live(hit[1])
        try:
            data = fetcher(lat, lon)
            if data:
                _cache[key] = (time.time(), data)
                return provider.live(data, note="Sentinel-2 (ESA Copernicus) via Microsoft Planetary Computer, 10 m pixels.")
            provider.mark_ok()
            reason = "No cloud-free satellite image of your field in recent months"
        except Exception as exc:
            provider.mark_error(f"{type(exc).__name__}: {exc}")
            reason = "Satellite service unreachable"
    return provider.fallback({"estimate": weather_estimate(weather)}, note=f"{reason}. Showing a weather-based estimate instead.")
