"""Phase 6: Radar endpoints — demo seed, analysis, alerts to nearby same-crop farmers + helpers."""
import pytest
from conftest import register
from weather_fixtures import make_raw, patch_weather, reset_weather_provider

# Hutton-day weather (t_min 20 ≥ 10, 24 humid hours) → late blight risk HIGH
BLIGHT_WEATHER = make_raw(humidity=95, t_hour=18.0)


@pytest.fixture(autouse=True)
def _weather(monkeypatch):
    reset_weather_provider()
    patch_weather(monkeypatch, BLIGHT_WEATHER)


def farmer_at(client, phone, lat, lon, crop="potato", lang="hi"):
    user, h = register(client, phone=phone, language=lang)
    client.put("/api/farm", json={"latitude": lat, "longitude": lon, "current_crop": crop}, headers=h)
    return user, h


def test_requires_location(client):
    _, h = register(client)
    assert client.get("/api/radar/map", headers=h).status_code == 409


def test_full_flow_seed_analyze_alert(client):
    me, h = farmer_at(client, "9000000001", 20.0, 73.8)
    tomato, th = farmer_at(client, "9000000002", 20.01, 73.81, crop="tomato")
    far, fh = farmer_at(client, "9000000003", 22.0, 76.0)
    helper, hh = register(client, phone="9000000004", role="helper", language="en")
    client.post("/api/family/link", json={"code": me["link_code"]}, headers=hh)

    r = client.post("/api/radar/demo/seed", json={"disease": "Potato___Late_blight", "farms": 6, "spread_km": 3}, headers=h)
    assert r.json()["seeded"] == 6

    summary = client.post("/api/radar/analyze", headers=h).json()
    assert summary["outbreaks"] == 1 and summary["levels"]["outbreak"] == 1  # 6 farms + high risk
    assert summary["weather_mode"] == "live"

    m = client.get("/api/radar/map", headers=h).json()
    assert m["has_demo"] is True and len(m["points"]) == 6
    o = m["outbreaks"][0]
    assert o["level"] == "outbreak" and o["weather_risk"] == "high" and o["farm_count"] == 6 and o["is_demo"]
    assert "farmer_id" not in m["points"][0]  # anonymous

    # potato farmer nearby → Hindi alert; their helper → English alert
    mine = client.get("/api/notifications", headers=h).json()["items"]
    assert any("आलू का पछेती झुलसा" in n["text"] and n["severity"] == "danger" for n in mine)
    helper_items = client.get("/api/notifications", headers=hh).json()["items"]
    assert any("Potato late blight found on 6 farms" in n["text"] for n in helper_items)
    # tomato farmer nearby and potato farmer 300 km away → no alert
    assert client.get("/api/notifications", headers=th).json()["unread"] == 0
    assert client.get("/api/notifications", headers=fh).json()["unread"] == 0

    # running again does not re-send the same alert
    assert client.post("/api/radar/analyze", headers=h).json()["alerts_sent"] == 0

    near = client.get("/api/radar/near-me", headers=h).json()["outbreaks"]
    assert near[0]["my_crop"] is True and near[0]["distance_km"] < 5


def test_small_cluster_is_watch_only_no_alert(client):
    _, h = farmer_at(client, "9000000001", 20.0, 73.8)
    client.post("/api/radar/demo/seed", json={"disease": "Potato___Late_blight", "farms": 2}, headers=h)
    s = client.post("/api/radar/analyze", headers=h).json()
    assert s["levels"]["watch"] == 1 and s["alerts_sent"] == 0


def test_demo_clear(client):
    _, h = farmer_at(client, "9000000001", 20.0, 73.8)
    client.post("/api/radar/demo/seed", json={"farms": 4}, headers=h)
    client.post("/api/radar/analyze", headers=h)
    assert client.delete("/api/radar/demo", headers=h).json()["removed_scans"] == 4
    m = client.get("/api/radar/map", headers=h).json()
    assert m["points"] == [] and m["outbreaks"] == [] and m["has_demo"] is False


def test_unknown_disease_rejected(client):
    _, h = farmer_at(client, "9000000001", 20.0, 73.8)
    assert client.post("/api/radar/demo/seed", json={"disease": "Nope"}, headers=h).status_code == 422


def test_weather_only_risk(client):
    _, h = farmer_at(client, "9000000001", 20.0, 73.8)
    r = client.get("/api/radar/weather-risk", headers=h).json()
    risks = {x["disease"]: x["risk"] for x in r["risks"]}
    assert r["supported"] and risks["Potato___Late_blight"] == "high"
    assert r["risks"][0]["risk"] == "high"  # highest risk listed first
    _, h2 = farmer_at(client, "9000000002", 20.0, 73.8, crop="wheat")
    r2 = client.get("/api/radar/weather-risk", headers=h2).json()
    assert r2["supported"] is False and r2["risks"] == []


def test_real_scans_count_and_old_scans_ignored(client):
    from datetime import datetime, timedelta, timezone

    hs = []
    for i in range(3):
        _, hi = farmer_at(client, f"900000001{i}", 20.0 + i * 0.01, 73.8)
        hs.append(hi)
    old = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
    for i, hi in enumerate(hs):
        client.post("/api/scans/sync", json={"scans": [
            {"client_id": f"real-scan-{i}", "crop": "potato", "disease": "Potato___Late_blight", "confidence": 0.9},
            {"client_id": f"old-scan-{i}", "crop": "potato", "disease": "Tomato___Early_blight", "confidence": 0.9, "scanned_at": old},
        ]}, headers=hi)
    s = client.post("/api/radar/analyze", headers=hs[0]).json()
    assert s["outbreaks"] == 1 and s["levels"]["warning"] == 1  # 3 real farms + high risk, old scans ignored
    assert client.get("/api/radar/map", headers=hs[0]).json()["has_demo"] is False
