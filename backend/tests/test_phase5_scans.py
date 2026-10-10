"""Phase 5: scan result sync (offline queue), privacy grid, history, delete."""
from conftest import register

from app.routers.scans import to_grid


def scan(cid="client-0001", disease="Potato___Late_blight", conf=0.93, **kw):
    return {"client_id": cid, "crop": "potato", "disease": disease, "confidence": conf, **kw}


def _farmer(client):
    farmer, fh = register(client, phone="9000000001")
    client.put("/api/farm", json={"latitude": 20.01234, "longitude": 73.78765}, headers=fh)
    return farmer, fh


def test_grid_rounding():
    assert to_grid(20.01234) == 20.01
    assert to_grid(73.78765) == 73.79
    assert to_grid(None) is None


def test_sync_is_idempotent_and_filters_low_confidence(client):
    _, fh = _farmer(client)
    batch = {"scans": [scan("client-0001"), scan("client-0002", conf=0.3), scan("client-0003", disease="Potato___healthy")]}
    r = client.post("/api/scans/sync", json=batch, headers=fh).json()
    assert r["saved"] == 2 and r["skipped"] == 1
    # re-sending the offline queue does not duplicate
    r = client.post("/api/scans/sync", json=batch, headers=fh).json()
    assert r["saved"] == 0 and r["skipped"] == 3

    items = client.get("/api/scans", headers=fh).json()
    assert len(items) == 2
    s = next(i for i in items if i["client_id"] == "client-0001")
    assert s["lat_grid"] == 20.01 and s["lon_grid"] == 73.79  # rounded, not exact farm location
    assert next(i for i in items if i["client_id"] == "client-0003")["healthy"] is True


def test_future_timestamp_clamped(client):
    _, fh = _farmer(client)
    client.post("/api/scans/sync", json={"scans": [scan(scanned_at="2099-01-01T00:00:00Z")]}, headers=fh)
    assert client.get("/api/scans", headers=fh).json()[0]["scanned_at"] < "2099"


def test_helper_needs_edit_permission_to_add(client):
    farmer, fh = _farmer(client)
    _, hh = register(client, phone="9000000002", role="helper")
    link = client.post("/api/family/link", json={"code": farmer["link_code"]}, headers=hh).json()
    p = {"farmer_id": farmer["id"]}
    assert client.post("/api/scans/sync", params=p, json={"scans": [scan()]}, headers=hh).status_code == 403
    client.patch(f"/api/family/{link['link_id']}", json={"can_edit": True}, headers=fh)
    assert client.post("/api/scans/sync", params=p, json={"scans": [scan()]}, headers=hh).json()["saved"] == 1
    assert len(client.get("/api/scans", params=p, headers=hh).json()) == 1


def test_delete_scan_and_isolation(client):
    _, fh = _farmer(client)
    _, oh = register(client, phone="9000000009")
    client.post("/api/scans/sync", json={"scans": [scan()]}, headers=fh)
    sid = client.get("/api/scans", headers=fh).json()[0]["id"]
    assert client.delete(f"/api/scans/{sid}", headers=oh).status_code == 404
    assert client.delete(f"/api/scans/{sid}", headers=fh).status_code == 204
    assert client.get("/api/scans", headers=fh).json() == []


def test_validation(client):
    _, fh = _farmer(client)
    assert client.post("/api/scans/sync", json={"scans": [scan(cid="x")]}, headers=fh).status_code == 422
    assert client.post("/api/scans/sync", json={"scans": [scan(conf=1.5)]}, headers=fh).status_code == 422
