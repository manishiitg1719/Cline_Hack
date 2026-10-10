"""Phase 4: /api/weather and /api/irrigation endpoints + alert delivery to helpers."""
import pytest
from conftest import register
from weather_fixtures import make_raw, patch_weather, reset_weather_provider


@pytest.fixture(autouse=True)
def _reset():
    reset_weather_provider()


def _setup(client, monkeypatch, raw):
    patch_weather(monkeypatch, raw)
    farmer, fh = register(client, phone="9000000001", language="hi")
    _, hh = register(client, phone="9000000002", role="helper", language="en")
    client.post("/api/family/link", json={"code": farmer["link_code"]}, headers=hh)
    client.put("/api/farm", json={"latitude": 20.0, "longitude": 73.8, "current_crop": "potato",
                                  "soil_type": "loamy", "area_acres": 1}, headers=fh)
    return farmer, fh, hh


def test_requires_location(client):
    _, fh = register(client)
    assert client.get("/api/weather", headers=fh).status_code == 409
    assert client.get("/api/irrigation", headers=fh).status_code == 409


def test_weather_endpoint_sends_alerts_once(client, monkeypatch):
    _, fh, hh = _setup(client, monkeypatch, make_raw(rain_mm=45, rain_prob=90))
    r = client.get("/api/weather", headers=fh).json()
    assert r["mode"] == "live" and r["source"] == "Open-Meteo"
    assert r["alerts_sent"] == 3  # heavy rain on each of the next 3 days
    assert client.get("/api/weather", headers=fh).json()["alerts_sent"] == 0  # de-duplicated
    items = client.get("/api/notifications", headers=hh).json()["items"]
    assert any("Heavy rain" in n["text"] for n in items)  # helper → English


def test_irrigation_endpoint(client, monkeypatch):
    farmer, fh, hh = _setup(client, monkeypatch, make_raw(soil=0.15))
    r = client.get("/api/irrigation", headers=fh).json()
    assert r["data"]["decision"] == "irrigate" and r["alert_sent"] is True
    notes = client.get("/api/notifications", headers=fh).json()["items"]
    assert any("सिंचाई" in n["text"] and "आलू" in n["text"] for n in notes)  # farmer → Hindi

    r = client.get("/api/irrigation", params={"farmer_id": farmer["id"]}, headers=hh)
    assert r.status_code == 200 and r.json()["alert_sent"] is False  # already sent today


def test_irrigation_offline_no_cache(client, monkeypatch):
    from app.providers import weather as wp

    _setup(client, monkeypatch, make_raw())

    def down(*_):
        raise ConnectionError("offline")
    monkeypatch.setattr(wp, "_fetch_open_meteo", down)
    _, fh = register(client, phone="9000000005")
    client.put("/api/farm", json={"latitude": 11.0, "longitude": 77.0}, headers=fh)
    r = client.get("/api/irrigation", headers=fh).json()
    assert r["mode"] == "fallback" and r["data"] is None
