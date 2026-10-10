"""Phase 1: auth, farm profile, status, message templates."""
from conftest import register

from app.services import messages


def test_health(client):
    assert client.get("/api/health").json()["app"] == "FarmGuard"


def test_root_page_instead_of_404(client):
    r = client.get("/")
    assert r.status_code == 200 and "FarmGuard API is running" in r.text and "5173" in r.text


def test_register_login_me(client):
    user, headers = register(client)
    assert user["role"] == "farmer"
    assert len(user["link_code"]) == 6

    r = client.post("/api/auth/login", json={"phone": "9876543210", "password": "secret123"})
    assert r.status_code == 200
    assert client.get("/api/auth/me", headers=headers).json()["name"] == "Ramesh"


def test_duplicate_phone_and_bad_login(client):
    register(client)
    r = client.post(
        "/api/auth/register",
        json={"name": "Someone", "phone": "9876543210", "password": "secret123", "role": "farmer"},
    )
    assert r.status_code == 409
    r = client.post("/api/auth/login", json={"phone": "9876543210", "password": "wrong"})
    assert r.status_code == 401


def test_helper_has_no_link_code(client):
    user, _ = register(client, phone="9000000001", role="helper", name="Suresh", language="en")
    assert user["link_code"] is None


def test_requires_auth(client):
    assert client.get("/api/farm").status_code == 401


def test_language_change(client):
    _, headers = register(client)
    r = client.patch("/api/auth/me/language", json={"language": "en"}, headers=headers)
    assert r.json()["language"] == "en"


def test_farm_profile_update(client):
    _, headers = register(client)
    farm = client.get("/api/farm", headers=headers).json()
    assert farm["latitude"] is None

    body = {
        "village": "Rampur", "district": "Nashik", "state": "Maharashtra",
        "latitude": 20.0, "longitude": 73.8, "area_acres": 2.5,
        "soil_type": "black", "water_source": "borewell",
        "current_crop": " Potato ", "past_crops": ["Wheat", "", "soybean"],
    }
    r = client.put("/api/farm", json=body, headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["current_crop"] == "potato"
    assert data["past_crops"] == ["wheat", "soybean"]


def test_farm_validation(client):
    _, headers = register(client)
    r = client.put("/api/farm", json={"latitude": 200}, headers=headers)
    assert r.status_code == 422


def test_status_lists_all_providers(client):
    data = client.get("/api/status").json()
    names = {p["name"] for p in data["providers"]}
    assert {"llm", "weather", "soil", "market", "satellite"} <= names
    llm = next(p for p in data["providers"] if p["name"] == "llm")
    assert llm["mode"] == "fallback"  # LLM disabled in tests


def test_message_render_en_hi():
    en = messages.render("need_fertilizer", {"quantity": 50, "item": "urea", "crop": "wheat"}, "en")
    assert en == "🛒 Please buy 50 kg of Urea. Needed for Wheat."
    hi = messages.render("need_fertilizer", {"quantity": 50, "item": "urea", "crop": "wheat"}, "hi")
    assert "यूरिया" in hi and "गेहूँ" in hi


def test_all_templates_exist_in_both_languages():
    cat = messages.catalog()
    for t in cat["quick"] + cat["alerts"]:
        for lang in ("en", "hi"):
            assert messages.title(t["id"], lang)
            messages.render(t["id"], {}, lang)


def test_whatsapp_link():
    link = messages.whatsapp_link("hello world", "98765 43210")
    assert link == "https://wa.me/919876543210?text=hello%20world"
