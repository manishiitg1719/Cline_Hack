"""Phase 2: message rendering endpoint, contacts, notifications."""
from conftest import register

from app.database import SessionLocal
from app.services.notify import notify


def test_templates_and_render(client):
    cat = client.get("/api/messages/templates").json()
    assert any(t["id"] == "come_to_field" for t in cat["quick"])

    r = client.post(
        "/api/messages/render",
        json={"template_id": "spraying_done", "params": {"crop": "potato"}, "language": "hi", "phone": "9876543210"},
    )
    data = r.json()
    assert "आलू" in data["text"]
    assert data["whatsapp"].startswith("https://wa.me/919876543210?text=")
    assert data["sms"].startswith("sms:9876543210?body=")


def test_render_unknown_template(client):
    r = client.post("/api/messages/render", json={"template_id": "nope", "language": "en"})
    assert r.status_code == 404


def test_contacts_crud_and_isolation(client):
    _, h1 = register(client, phone="9000000001")
    _, h2 = register(client, phone="9000000002", name="Other")

    r = client.post("/api/contacts", json={"name": "Son", "phone": "9123456789", "category": "family"}, headers=h1)
    assert r.status_code == 201
    cid = r.json()["id"]

    assert len(client.get("/api/contacts", headers=h1).json()) == 1
    assert client.get("/api/contacts", headers=h2).json() == []
    # another user cannot edit / delete
    assert client.delete(f"/api/contacts/{cid}", headers=h2).status_code == 404

    r = client.put(f"/api/contacts/{cid}", json={"name": "Beta", "phone": "9123456789", "language": "en"}, headers=h1)
    assert r.json()["name"] == "Beta"
    assert client.delete(f"/api/contacts/{cid}", headers=h1).status_code == 204
    assert client.get("/api/contacts", headers=h1).json() == []


def test_contact_validation(client):
    _, h = register(client)
    assert client.post("/api/contacts", json={"name": "X", "phone": "12"}, headers=h).status_code == 422


def test_notifications_rendered_in_user_language(client):
    user, h = register(client, language="hi")
    with SessionLocal() as db:
        notify(db, user["id"], "irrigation", "irrigation_delay", {"rain": 80}, severity="warning")

    data = client.get("/api/notifications", headers=h).json()
    assert data["unread"] == 1
    item = data["items"][0]
    assert "80%" in item["text"] and "सिंचाई" in item["text"]

    client.post(f"/api/notifications/{item['id']}/read", headers=h)
    assert client.get("/api/notifications", headers=h).json()["unread"] == 0


def test_mark_all_read_and_ownership(client):
    u1, h1 = register(client, phone="9000000001")
    _, h2 = register(client, phone="9000000002")
    with SessionLocal() as db:
        notify(db, u1["id"], "custom", "come_to_field")
        notify(db, u1["id"], "custom", "come_to_field")
    nid = client.get("/api/notifications", headers=h1).json()["items"][0]["id"]
    assert client.post(f"/api/notifications/{nid}/read", headers=h2).status_code == 404
    client.post("/api/notifications/read-all", headers=h1)
    assert client.get("/api/notifications", headers=h1).json()["unread"] == 0
