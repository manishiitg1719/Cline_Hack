"""Phase 7: /api/crop/advice and /api/crop/read-card."""
import pytest
from conftest import register

from app.providers import climate, soil
from app.providers.registry import get_provider


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    for n in ("soil", "weather", "llm"):
        p = get_provider(n)
        p.state.last_ok = p.state.last_checked = None
        p.state.last_error = ""
    climate._cache.clear()
    monkeypatch.setattr(soil, "_fetch", lambda la, lo: {"ph": 7.4, "clay": 22, "sand": 40, "soc": 8.0, "nitrogen": 0.7, "cec": 15})
    monkeypatch.setattr(climate, "_fetch", lambda *a: {"temperature": 17.5, "rainfall": 50, "humidity": 62, "period": "x"})


def _farm(client):
    _, h = register(client)
    client.put("/api/farm", json={"latitude": 30.9, "longitude": 75.8, "water_source": "canal", "area_acres": 2,
                                  "current_crop": "rice", "past_crops": ["rice"]}, headers=h)
    return h


def test_advice_endpoint(client):
    h = _farm(client)
    r = client.post("/api/crop/advice", json={"season": "rabi", "goal": "improve_soil"}, headers=h).json()
    assert len(r["top"]) == 3 and r["confidence"] == "medium"
    assert r["sources"]["soil"]["mode"] == "live" and r["inputs"]["last_crop"] == "rice"
    assert r["top"][0]["crop"] in {"chickpea", "wheat", "mustard", "potato", "onion"}
    assert len(r["rotation_plan"]) == 3 and r["season"] == "rabi"


def test_advice_with_soil_card(client):
    h = _farm(client)
    card = {"ph": 6.8, "n": 210, "p": 8, "k": 150, "oc": 0.4}
    r = client.post("/api/crop/advice", json={"season": "rabi", "card": card}, headers=h).json()
    assert r["confidence"] == "high" and r["inputs"]["soil_source"] == "card"
    assert {t["code"] for t in r["fertilizer_tips"]} == {"low_n", "low_p", "low_oc"}


def test_advice_overrides_and_validation(client):
    h = _farm(client)
    r = client.post("/api/crop/advice", json={"season": "kharif", "water_source": "rain", "budget": "low", "last_crop": ""}, headers=h).json()
    assert all(t["cost_per_acre"] <= 15000 for t in r["top"])
    assert "rice" not in [t["crop"] for t in r["top"]]  # high-water crop, rain-fed, over budget
    assert all(n["blockers"] for n in r["not_recommended"])
    assert client.post("/api/crop/advice", json={"season": "monsoon"}, headers=h).status_code == 422
    _, h2 = register(client, phone="9000000002")
    assert client.post("/api/crop/advice", json={}, headers=h2).status_code == 409


def test_read_card_falls_back_without_ai(client):
    _, h = register(client)
    r = client.post("/api/crop/read-card", files={"image": ("card.jpg", b"\xff\xd8fake", "image/jpeg")}, headers=h).json()
    assert r["mode"] == "fallback" and r["values"] is None
    bad = client.post("/api/crop/read-card", files={"image": ("x.txt", b"hello", "text/plain")}, headers=h)
    assert bad.status_code == 415


def test_read_card_live_with_mocked_ai(client, monkeypatch):
    from app.providers import llm
    from app.routers import crop as crop_router

    reply = '```json\n{"ph": 7.1, "n": 230, "p": 12.5, "k": 180, "oc": 0.42, "ec": null}\n```'
    monkeypatch.setattr(crop_router.llm, "chat", lambda db, msgs, **kw: reply)
    _, h = register(client)
    r = client.post("/api/crop/read-card", files={"image": ("card.jpg", b"\xff\xd8fake", "image/jpeg")}, headers=h).json()
    assert r["mode"] == "live" and r["values"]["n"] == 230 and r["values"]["ec"] is None
    assert llm.extract_json('x {"a": 1} y') == {"a": 1}


def test_llm_daily_limit(client, monkeypatch):
    from app.config import get_settings
    from app.database import SessionLocal
    from app.providers import llm

    s = get_settings()
    for k, v in {"llm_enabled": True, "llm_api_key": "k", "llm_base_url": "http://x", "llm_model": "m", "llm_daily_call_limit": 1}.items():
        monkeypatch.setattr(s, k, v)
    with SessionLocal() as db:
        llm._use_quota(db)
        with pytest.raises(llm.LLMUnavailable):
            llm._use_quota(db)
