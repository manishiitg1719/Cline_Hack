"""Phase 9: assistant (fallback + mocked live), schemes, marketplace listings."""
import pytest
from conftest import register
from weather_fixtures import make_raw, patch_weather, reset_weather_provider

from app.services import assistant_fallback as fb


@pytest.fixture(autouse=True)
def _weather(monkeypatch):
    reset_weather_provider()
    patch_weather(monkeypatch, make_raw(soil=0.15, rain_prob=10))


def _farmer(client, phone="9000000001", lang="hi", lat=30.9, lon=75.8):
    user, h = register(client, phone=phone, language=lang)
    client.put("/api/farm", json={"latitude": lat, "longitude": lon, "current_crop": "potato", "soil_type": "loamy",
                                  "village": "Rampur"}, headers=h)
    return user, h


def test_matching_en_hi():
    assert fb.match("Should I irrigate today?") == ("intent", "irrigation")
    assert fb.match("क्या आज सिंचाई करूं?") == ("intent", "irrigation")
    assert fb.match("what is pm kisan") == ("faq", "pm_kisan")
    assert fb.match("मेरी फसल में कीड़े लगे हैं") == ("faq", "pests")
    assert fb.match("tell me a joke") is None


def test_faq_files_complete():
    cfg = fb.load("assistant", "faq")
    for lang in ("en", "hi"):
        s = fb.strings(lang)
        for item in cfg["faq"]:
            assert s["answers"][item["id"]], (lang, item["id"])
        assert len(s["suggestions"]) == 6
        for sug in s["suggestions"]:
            assert fb.match(sug) is not None, (lang, sug)  # every suggestion has an answer


def test_assistant_fallback_uses_farm_data(client):
    _, h = _farmer(client)
    r = client.post("/api/assistant/ask", json={"message": "क्या आज सिंचाई करूं?"}, headers=h).json()
    assert r["mode"] == "fallback" and r["link"] == "/irrigation"
    assert "अभी सिंचाई करें" in r["answer"] and "आलू" in r["answer"]
    r = client.post("/api/assistant/ask", json={"message": "weather this week", "language": "en"}, headers=h).json()
    assert r["answer"].startswith("🌦️ Next 3 days")
    r = client.post("/api/assistant/ask", json={"message": "any outbreak near me?", "language": "en"}, headers=h).json()
    assert "No disease outbreaks" in r["answer"]
    r = client.post("/api/assistant/ask", json={"message": "xyzzy", "language": "en"}, headers=h).json()
    assert "don't have a ready answer" in r["answer"]


def test_assistant_needs_location_for_dynamic(client):
    _, h = register(client, phone="9000000009", language="en")
    r = client.post("/api/assistant/ask", json={"message": "should I irrigate"}, headers=h).json()
    assert "mark your farm location" in r["answer"]
    assert client.get("/api/assistant/intro", headers=h).json()["suggestions"][0] == "Should I irrigate today?"


def test_assistant_live_mocked(client, monkeypatch):
    from app.services import assistant

    seen = {}

    def fake_chat(db, messages, **kw):
        seen["messages"] = messages
        return "Irrigate this evening."
    monkeypatch.setattr(assistant.llm, "chat", fake_chat)
    _, h = _farmer(client)
    r = client.post("/api/assistant/ask", json={"message": "irrigate?", "language": "en",
                                                 "history": [{"role": "user", "content": "hi"}]}, headers=h).json()
    assert r["mode"] == "live" and r["answer"] == "Irrigate this evening."
    joined = " ".join(m["content"] for m in seen["messages"])
    assert "Farm data" in joined and "potato" in joined and "Reference note" in joined


def test_schemes(client):
    _, h = register(client, language="hi")
    r = client.get("/api/schemes", headers=h).json()
    assert len(r["schemes"]) == 8 and r["schemes"][0]["name"] == "पीएम-किसान"
    en = client.get("/api/schemes", params={"language": "en"}, headers=h).json()
    assert all(s["url"].startswith("https://") and s["benefit"] for s in en["schemes"])


def test_listings_flow(client):
    _, h1 = _farmer(client)
    _, h2 = _farmer(client, phone="9000000002", lat=30.95, lon=75.8)  # ~5.5 km away
    _, h3 = _farmer(client, phone="9000000003", lat=26.0, lon=80.0)   # far away
    body = {"kind": "equipment", "category": "tractor", "title": "Mahindra 575 tractor", "price": 800, "unit": "hour"}
    r = client.post("/api/listings", json=body, headers=h1)
    assert r.status_code == 201 and r.json()["village"] == "Rampur"
    lid = r.json()["id"]
    assert client.post("/api/listings", json={**body, "category": "spaceship"}, headers=h1).status_code == 422

    near = client.get("/api/listings", params={"kind": "equipment"}, headers=h2).json()["items"]
    assert len(near) == 1 and 4 < near[0]["distance_km"] < 7 and near[0]["whatsapp"].startswith("https://wa.me/919000000001")
    assert client.get("/api/listings", params={"kind": "equipment"}, headers=h3).json()["items"] == []
    mine = client.get("/api/listings", params={"kind": "equipment", "mine": True}, headers=h1).json()["items"]
    assert mine[0]["mine"] is True and mine[0]["whatsapp"] is None

    waste = {"kind": "waste", "category": "straw", "title": "Paddy straw 40 quintal", "price": 0, "unit": "free"}
    assert client.post("/api/listings", json=waste, headers=h2).status_code == 201
    assert len(client.get("/api/listings", params={"kind": "waste"}, headers=h1).json()["items"]) == 1

    assert client.delete(f"/api/listings/{lid}", headers=h2).status_code == 404
    assert client.delete(f"/api/listings/{lid}", headers=h1).status_code == 204
