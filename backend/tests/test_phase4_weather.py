"""Phase 4: weather provider (LIVE / cache FALLBACK) and pure rule engines."""
from datetime import datetime, timedelta, timezone

import pytest
from weather_fixtures import make_raw, reset_weather_provider

from app.database import SessionLocal
from app.models import WeatherCache
from app.providers import weather as wp
from app.providers.registry import get_provider
from app.services import alerts, irrigation


@pytest.fixture(autouse=True)
def _reset():
    reset_weather_provider()


def down(*_):
    raise ConnectionError("offline")


def test_normalize_shape():
    data = wp.normalize(make_raw())
    assert len(data["days"]) == 7
    assert data["soil_moisture"] == 0.20
    assert data["days"][0]["humid_hours"] == 24 and data["days"][0]["t_mean"] == 18.0


def test_live_then_cache_then_fallback(client):
    with SessionLocal() as db:
        r = wp.get_forecast(db, 20.0, 73.8, fetcher=lambda la, lo: wp.normalize(make_raw()))
        assert r.mode == "live" and r.data["days"]

        def boom(*_):
            raise AssertionError("fresh cache should be reused")
        assert wp.get_forecast(db, 20.0, 73.8, fetcher=boom).mode == "live"

        row = db.query(WeatherCache).one()
        row.fetched_at = datetime.now(timezone.utc) - timedelta(hours=5)
        db.commit()
        r = wp.get_forecast(db, 20.0, 73.8, fetcher=down)
        assert r.mode == "fallback" and r.data["stale_hours"] == 5
        assert "5 h ago" in r.note
        assert get_provider("weather").status()["mode"] == "fallback"


def test_fallback_without_cache(client):
    with SessionLocal() as db:
        r = wp.get_forecast(db, 10.0, 10.0, fetcher=down)
        assert r.mode == "fallback" and r.data is None


def test_force_fallback_uses_cache(client, monkeypatch):
    from app.config import get_settings

    with SessionLocal() as db:
        wp.get_forecast(db, 20.0, 73.8, fetcher=lambda la, lo: wp.normalize(make_raw()))
        monkeypatch.setattr(get_settings(), "force_fallback", True)
        r = wp.get_forecast(db, 20.0, 73.8, fetcher=down)
        assert r.mode == "fallback" and r.data is not None


def test_irrigation_decisions():
    dry = wp.normalize(make_raw(soil=0.15))  # loamy WP .12 FC .27 → 20 % available
    r = irrigation.decide(dry, "potato", "loamy", "borewell", 2)
    assert r["decision"] == "irrigate" and "soil_dry" in r["reasons"]
    assert r["crop_need_today_mm"] == round(1.15 * 5.0, 2)
    assert r["litres_today"] == round(5.75 * 4046.86 * 2)

    rainy = wp.normalize(make_raw(soil=0.15, rain_prob=85, rain_mm=12))
    assert irrigation.decide(rainy, "potato", "loamy")["decision"] == "delay"

    wet = wp.normalize(make_raw(soil=0.26))
    assert irrigation.decide(wet, "wheat", "loamy")["decision"] == "monitor"
    # black soil holds more water: same θ=0.26 is dry for black soil (WP .22, FC .40 → 22 %)
    assert irrigation.decide(wet, "cotton", "black")["decision"] == "irrigate"


def test_irrigation_without_soil_data():
    data = wp.normalize(make_raw(et0=6.0))
    data["soil_moisture"] = None
    r = irrigation.decide(data, "wheat")
    assert r["decision"] == "irrigate" and "no_soil_data" in r["reasons"]


def test_weather_alert_rules():
    found = alerts.weather_alerts(wp.normalize(make_raw(rain_mm=45, rain_prob=90, t_max=42, wind=50)))
    assert {a["template_id"] for a in found} == {"weather_heavy_rain", "weather_heatwave", "weather_strong_wind"}
    assert alerts.weather_alerts(wp.normalize(make_raw())) == []
