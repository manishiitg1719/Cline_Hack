"""Phase 3: Family Helper linking, permissions, acting for farmer, Help me."""
from conftest import register


def _link(client):
    farmer, fh = register(client, phone="9000000001", name="Ramesh", language="hi")
    helper, hh = register(client, phone="9000000002", role="helper", name="Suresh", language="en")
    r = client.post("/api/family/link", json={"code": farmer["link_code"], "relation": "Son"}, headers=hh)
    assert r.status_code == 201, r.text
    return farmer, fh, helper, hh, r.json()


def test_link_and_list_both_sides(client):
    farmer, fh, helper, hh, link = _link(client)
    assert link["user_id"] == farmer["id"] and link["can_edit"] is False

    farmer_view = client.get("/api/family", headers=fh).json()
    assert farmer_view[0]["name"] == "Suresh" and farmer_view[0]["relation"] == "Son"
    assert client.get("/api/family", headers=hh).json()[0]["name"] == "Ramesh"
    # farmer got an in-app notification about the new helper
    assert client.get("/api/notifications", headers=fh).json()["unread"] == 1


def test_link_errors(client):
    farmer, fh, helper, hh, _ = _link(client)
    assert client.post("/api/family/link", json={"code": farmer["link_code"]}, headers=hh).status_code == 409
    assert client.post("/api/family/link", json={"code": "000000" if farmer["link_code"] != "000000" else "111111"}, headers=hh).status_code == 404
    assert client.post("/api/family/link", json={"code": farmer["link_code"]}, headers=fh).status_code == 403
    assert client.post("/api/family/link", json={"code": "12ab56"}, headers=hh).status_code == 422


def test_helper_view_only_then_edit(client):
    farmer, fh, helper, hh, link = _link(client)
    fid = farmer["id"]
    # helper can view
    assert client.get("/api/farm", params={"farmer_id": fid}, headers=hh).status_code == 200
    # helper must pass farmer_id
    assert client.get("/api/farm", headers=hh).status_code == 400
    # view-only: cannot edit
    r = client.put("/api/farm", params={"farmer_id": fid}, json={"village": "X"}, headers=hh)
    assert r.status_code == 403
    # helper cannot grant themselves edit
    assert client.patch(f"/api/family/{link['link_id']}", json={"can_edit": True}, headers=hh).status_code == 403
    # farmer grants edit
    assert client.patch(f"/api/family/{link['link_id']}", json={"can_edit": True}, headers=fh).json()["can_edit"] is True
    r = client.put("/api/farm", params={"farmer_id": fid}, json={"village": "Rampur"}, headers=hh)
    assert r.status_code == 200 and r.json()["village"] == "Rampur"


def test_unlinked_helper_blocked(client):
    farmer, _ = register(client, phone="9000000001")
    _, hh = register(client, phone="9000000003", role="helper")
    assert client.get("/api/farm", params={"farmer_id": farmer["id"]}, headers=hh).status_code == 403


def test_farmer_cannot_access_other_farm(client):
    f1, h1 = register(client, phone="9000000001")
    f2, _ = register(client, phone="9000000004")
    assert client.get("/api/farm", params={"farmer_id": f2["id"]}, headers=h1).status_code == 403


def test_help_me_language_bridge(client):
    farmer, fh, helper, hh, _ = _link(client)
    r = client.post("/api/family/help", json={"issue": "disease", "note": "Leaves turning brown"}, headers=fh)
    data = r.json()
    assert data["notified"] == 1
    h = data["helpers"][0]
    # helper uses English → message rendered in English
    assert "Ramesh needs help: disease in the crop" in h["text"]
    assert h["whatsapp"].startswith("https://wa.me/919000000002")
    notif = client.get("/api/notifications", headers=hh).json()
    assert notif["unread"] == 1 and "Ramesh" in notif["items"][0]["text"]
    # helpers cannot use the Help button
    assert client.post("/api/family/help", json={}, headers=hh).status_code == 403


def test_unlink(client):
    farmer, fh, helper, hh, link = _link(client)
    assert client.delete(f"/api/family/{link['link_id']}", headers=hh).status_code == 204
    assert client.get("/api/family", headers=fh).json() == []
