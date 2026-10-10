"""End-to-end smoke test against a RUNNING backend (default http://127.0.0.1:8000).

Usage:  python scripts/smoke_test.py [base_url]
Creates throwaway users with random phone numbers, links a helper, sends help.
"""
from __future__ import annotations

import random
import sys

import httpx

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")


def phone() -> str:
    return "9" + "".join(random.choices("0123456789", k=9))


def main() -> None:
    c = httpx.Client(base_url=BASE, timeout=10)
    assert c.get("/api/health").json()["status"] == "ok"

    f = c.post("/api/auth/register", json={"name": "Ramesh", "phone": phone(), "password": "secret123", "role": "farmer", "language": "hi"}).json()
    fh = {"Authorization": f"Bearer {f['token']}"}
    h = c.post("/api/auth/register", json={"name": "Suresh", "phone": phone(), "password": "secret123", "role": "helper", "language": "en"}).json()
    hh = {"Authorization": f"Bearer {h['token']}"}
    print("✓ registered farmer + helper, link code:", f["user"]["link_code"])

    farm = c.put("/api/farm", headers=fh, json={"village": "Rampur", "latitude": 20.0, "longitude": 73.8, "current_crop": "potato", "water_source": "borewell"}).json()
    print("✓ farm saved:", farm["village"], farm["current_crop"])

    link = c.post("/api/family/link", headers=hh, json={"code": f["user"]["link_code"], "relation": "Son"}).json()
    print("✓ helper linked, can_edit =", link["can_edit"])

    view = c.get("/api/farm", headers=hh, params={"farmer_id": f["user"]["id"]})
    print("✓ helper views farm:", view.status_code)

    msg = c.post("/api/messages/render", json={"template_id": "need_fertilizer", "params": {"quantity": 50, "item": "urea", "crop": "potato"}, "language": "hi"}).json()
    print("✓ Hindi message:", msg["text"])

    help_res = c.post("/api/family/help", headers=fh, json={"issue": "disease", "note": "Leaves turning brown"}).json()
    print("✓ help sent →", help_res["helpers"][0]["text"])

    notif = c.get("/api/notifications", headers=hh).json()
    print("✓ helper notifications unread:", notif["unread"])

    status = c.get("/api/status").json()
    print("✓ status:", ", ".join(f"{p['name']}={p['mode']}" for p in status["providers"]))
    print("ALL OK")


if __name__ == "__main__":
    main()
