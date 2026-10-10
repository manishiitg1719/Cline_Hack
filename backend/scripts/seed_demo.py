"""Prepare a ready-to-present demo against a RUNNING backend.

Creates (or reuses) two accounts you can log in with:
  Farmer  : phone 9999900001, password demo1234 (Hindi)   — potato farm near Ludhiana, Punjab
  Helper  : phone 9999900002, password demo1234 (English) — linked to the farmer, can edit
Adds contacts, a tractor + straw listing from a neighbour, DEMO disease scans around the farm and runs the Radar.
Usage: python scripts/seed_demo.py [base_url]    (re-running is safe)
"""
from __future__ import annotations

import sys

import httpx

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")
PW = "demo1234"
LAT, LON = 30.90, 75.85


def account(c: httpx.Client, phone: str, name: str, role: str, lang: str) -> tuple[dict, dict]:
    r = c.post("/api/auth/login", json={"phone": phone, "password": PW})
    if r.status_code != 200:
        r = c.post("/api/auth/register", json={"name": name, "phone": phone, "password": PW, "role": role, "language": lang})
        r.raise_for_status()
    body = r.json()
    return body["user"], {"Authorization": f"Bearer {body['token']}"}


def wait_for_backend(c: httpx.Client, seconds: int = 30) -> None:
    """Wait until the backend answers; exit with a clear message instead of a traceback."""
    import time

    for i in range(seconds):
        try:
            if c.get("/api/health", timeout=3).status_code == 200:
                return
        except httpx.HTTPError:
            pass
        if i == 0:
            print(f"Waiting for the backend at {BASE} ...")
        time.sleep(1)
    print(f"\nERROR: the FarmGuard backend is not running at {BASE}.\n"
          "Start it FIRST in its own terminal and keep that window open:\n"
          "    cd D:\\Cline_Hackathon\\backend\n"
          "    python -m uvicorn app.main:app --port 8000\n"
          "or simply double-click start.bat in D:\\Cline_Hackathon.")
    sys.exit(1)


def main() -> None:
    c = httpx.Client(base_url=BASE, timeout=60)
    wait_for_backend(c)
    farmer, fh = account(c, "9999900001", "Gurpreet Singh", "farmer", "hi")
    helper, hh = account(c, "9999900002", "Aman (son)", "helper", "en")
    neighbour, nh = account(c, "9999900003", "Harjit (neighbour)", "farmer", "hi")

    c.put("/api/farm", headers=fh, json={"village": "Lalton Kalan", "district": "Ludhiana", "state": "Punjab", "latitude": LAT,
                                         "longitude": LON, "area_acres": 4, "soil_type": "loamy", "water_source": "borewell",
                                         "current_crop": "potato", "past_crops": ["rice"]}).raise_for_status()
    c.put("/api/farm", headers=nh, json={"village": "Lalton Kalan", "latitude": LAT + 0.02, "longitude": LON + 0.01,
                                         "current_crop": "potato"}).raise_for_status()

    links = c.get("/api/family", headers=fh).json()
    if not links:
        c.post("/api/family/link", headers=hh, json={"code": farmer["link_code"], "relation": "Son"}).raise_for_status()
        links = c.get("/api/family", headers=fh).json()
    c.patch(f"/api/family/{links[0]['link_id']}", headers=fh, json={"can_edit": True})

    if not c.get("/api/contacts", headers=fh).json():
        c.post("/api/contacts", headers=fh, json={"name": "Aman (beta)", "phone": "9999900002", "category": "family", "language": "en"})
        c.post("/api/contacts", headers=fh, json={"name": "Khad dukaan", "phone": "9999900004", "category": "supplier", "language": "hi"})

    if not c.get("/api/listings", headers=nh, params={"kind": "equipment", "mine": True}).json()["items"]:
        c.post("/api/listings", headers=nh, json={"kind": "equipment", "category": "seeder", "title": "Happy Seeder with tractor",
                                                  "description": "Sow wheat directly into paddy straw — no burning.", "price": 1800, "unit": "acre"})
        c.post("/api/listings", headers=nh, json={"kind": "waste", "category": "straw", "title": "Paddy straw, 3 acres",
                                                  "description": "Free for fodder or biogas, pick up from field.", "price": 0, "unit": "free"})

    c.delete("/api/radar/demo", headers=fh)
    c.post("/api/radar/demo/seed", headers=fh, json={"disease": "Potato___Late_blight", "farms": 7, "spread_km": 3}).raise_for_status()
    summary = c.post("/api/radar/analyze", headers=fh).json()

    print("DEMO READY")
    print(f"  Farmer : 9999900001 / {PW}  (Hindi)   link code {farmer['link_code']}")
    print(f"  Helper : 9999900002 / {PW}  (English) linked, can edit")
    print(f"  Radar  : {summary['outbreaks']} outbreak(s), {summary['alerts_sent']} new alert(s), weather {summary['weather_mode']}")
    print("  Open http://localhost:5173 and follow docs/DEMO_SCRIPT.md")


if __name__ == "__main__":
    main()
