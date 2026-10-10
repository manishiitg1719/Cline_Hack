"""Seasonal climate for crop planning: last year's same-season averages from the Open-Meteo archive
(LIVE, free, no key) → regional defaults by season (FALLBACK). Cached in memory per ~10 km cell."""
from __future__ import annotations

from datetime import date

import httpx

from .base import ProviderResult
from .registry import get_provider

ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
# Indian cropping seasons (sowing → harvest months)
SEASONS = {"kharif": (6, 10), "rabi": (11, 3), "zaid": (3, 6)}
# Rough all-India plains defaults when offline (temp °C, rainfall mm over season, humidity %)
DEFAULTS = {"kharif": (29.0, 800.0, 75.0), "rabi": (18.0, 60.0, 60.0), "zaid": (32.0, 80.0, 45.0)}
_cache: dict[tuple, dict] = {}


def current_season(today: date | None = None) -> str:
    m = (today or date.today()).month
    if 6 <= m <= 10:
        return "kharif"
    if m >= 11 or m <= 2:
        return "rabi"
    return "zaid"


def _window(season: str, today: date) -> tuple[date, date]:
    """Most recent COMPLETE occurrence of the season (archive data lags ~5 days)."""
    start_m, end_m = SEASONS[season]
    for year in (today.year, today.year - 1, today.year - 2):
        start = date(year, start_m, 1)
        end_year = year + 1 if end_m < start_m else year
        end = date(end_year, end_m, 28)
        if end < today.replace(day=1):
            return start, end
    raise ValueError("no season window")


def _fetch(lat: float, lon: float, season: str, today: date) -> dict:
    start, end = _window(season, today)
    params = {"latitude": lat, "longitude": lon, "start_date": start.isoformat(), "end_date": end.isoformat(),
              "daily": "temperature_2m_mean,precipitation_sum,relative_humidity_2m_mean", "timezone": "auto"}
    r = httpx.get(ARCHIVE, params=params, timeout=25)
    r.raise_for_status()
    d = r.json()["daily"]
    t = [x for x in d["temperature_2m_mean"] if x is not None]
    p = [x for x in d["precipitation_sum"] if x is not None]
    h = [x for x in d["relative_humidity_2m_mean"] if x is not None]
    return {"temperature": round(sum(t) / len(t), 1), "rainfall": round(sum(p)), "humidity": round(sum(h) / len(h)),
            "period": f"{start.isoformat()} to {end.isoformat()}"}


def get_season_climate(lat: float, lon: float, season: str, today: date | None = None, fetcher=None) -> ProviderResult:
    provider = get_provider("weather")
    today = today or date.today()
    fetcher = fetcher or _fetch
    key = (round(lat, 1), round(lon, 1), season, today.year)
    live_ok, reason = provider.is_live()
    if live_ok:
        if key in _cache:
            return provider.live(_cache[key])
        try:
            data = fetcher(lat, lon, season, today)
            _cache[key] = data
            return provider.live(data, note="Last year's same-season weather at your farm.")
        except Exception as exc:
            provider.mark_error(f"{type(exc).__name__}: {exc}")
            reason = "Open-Meteo archive unreachable"
    t, p, h = DEFAULTS[season]
    return provider.fallback({"temperature": t, "rainfall": p, "humidity": h, "period": "typical"},
                             note=f"{reason}. Using typical {season} values for Indian plains.")
