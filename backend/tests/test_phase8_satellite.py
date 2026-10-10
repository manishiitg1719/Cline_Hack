"""Phase 8: Sentinel-2 helpers, field-health interpretation, provider LIVE/FALLBACK, endpoint."""
import pytest
from conftest import register
from weather_fixtures import make_raw, patch_weather, reset_weather_provider

from app.providers import satellite, sentinel
from app.providers.registry import get_provider
from app.services.field_health import health_score, interpret

SAT = {"latest": {"date": "2026-09-18", "ndvi": 0.72, "ndmi": 0.31, "ndvi_std": 0.05, "low_patch_pct": 3},
       "series": [{"date": "2026-08-16", "ndvi": 0.55}, {"date": "2026-09-18", "ndvi": 0.72}]}


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    p = get_provider("satellite")
    p.state.last_ok = p.state.last_checked = None
    p.state.last_error = ""
    satellite._cache.clear()
    reset_weather_provider()
    patch_weather(monkeypatch, make_raw(soil=0.18))


def test_polygon_and_histogram_helpers():
    poly = sentinel.field_polygon(30.0, 75.0)
    ring = poly["geometry"]["coordinates"][0]
    assert ring[0] == ring[-1] and len(ring) == 5
    scl = {"histogram": [[80, 0, 10, 10], [3.0, 4.0, 5.0, 6.0, 9.0]]}  # bins: [3,4) shadow, [4,5) veg, [5,6) soil, [6,9] other
    assert sentinel.clear_fraction(scl) == pytest.approx(0.1)
    scl2 = {"histogram": [[90, 10], [4.0, 4.5, 5.0]]}  # all vegetation / soil boundary
    assert sentinel.clear_fraction(scl2) == pytest.approx(1.0)
    ndvi = {"histogram": [[10, 30, 60], [0.0, 0.25, 0.5, 0.8]]}
    assert sentinel.low_ndvi_pct(ndvi) == 10


def test_interpret():
    h = interpret(SAT)
    assert h["status"] == "healthy" and h["score"] == health_score(0.72) == 100
    assert "growing" in h["flags"] and "water_ok" in h["flags"]
    dry = interpret({**SAT, "latest": {**SAT["latest"], "ndmi": -0.05}})
    assert dry["status"] == "moderate" and "water_stress" in dry["flags"]
    drop = interpret({"latest": {**SAT["latest"], "ndvi": 0.15}, "series": [{"date": "a", "ndvi": 0.6}, {"date": "b", "ndvi": 0.15}]})
    assert drop["status"] == "bare" and {"dropping", "bare_or_harvested"} <= set(drop["flags"])
    patchy = interpret({**SAT, "latest": {**SAT["latest"], "ndvi": 0.45, "low_patch_pct": 30}})
    assert patchy["status"] == "moderate" and "patchy" in patchy["flags"]


def test_provider_live_cache_and_fallback():
    calls = []

    def fake(lat, lon):
        calls.append(1)
        return SAT
    r = satellite.get_field_health(30.9, 75.7, fetcher=fake)
    assert r.mode == "live" and r.data == SAT
    satellite.get_field_health(30.9, 75.7, fetcher=fake)
    assert len(calls) == 1  # cached

    none = satellite.get_field_health(1.0, 1.0, weather={"soil_moisture": 0.3, "days": []}, fetcher=lambda a, b: None)
    assert none.mode == "fallback" and "cloud-free" in none.note and none.data["estimate"]["water_score"] > 50

    def down(*_):
        raise ConnectionError("x")
    r = satellite.get_field_health(2.0, 2.0, weather=None, fetcher=down)
    assert r.mode == "fallback" and r.data["estimate"] is None


def test_endpoint_live_and_fallback(client, monkeypatch):
    _, h = register(client)
    assert client.get("/api/satellite", headers=h).status_code == 409
    client.put("/api/farm", json={"latitude": 30.9, "longitude": 75.7, "current_crop": "rice"}, headers=h)

    monkeypatch.setattr(satellite, "fetch_series", lambda lat, lon: SAT)
    r = client.get("/api/satellite", headers=h).json()
    assert r["mode"] == "live" and r["data"]["status"] == "healthy" and len(r["data"]["series"]) == 2

    satellite._cache.clear()

    def down(*_):
        raise ConnectionError("x")
    monkeypatch.setattr(satellite, "fetch_series", down)
    r = client.get("/api/satellite", headers=h).json()
    assert r["mode"] == "fallback" and "water_score" in r["data"]["estimate"]
