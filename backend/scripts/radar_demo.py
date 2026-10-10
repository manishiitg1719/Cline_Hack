"""Judges' demo of the Village Disease Radar against a RUNNING backend (real weather).

Usage: python scripts/radar_demo.py [base_url]
Creates: farmer A (potato, Hindi), neighbour B (potato, English, 2 km away), helper of A (English).
Seeds DEMO scans around A, runs the analysis and prints who got which alert. Cleans demo data at the end.
"""
from __future__ import annotations

import random
import sys

import httpx

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")
LAT, LON = 30.90, 75.85  # Ludhiana, Punjab (potato belt)


def phone() -> str:
    return "9" + "".join(random.choices("0123456789", k=9))


def register(c, name, role, lang):
    r = c.post("/api/auth/register", json={"name": name, "phone": phone(), "password": "secret123", "role": role, "language": lang}).json()
    return r["user"], {"Authorization": f"Bearer {r['token']}"}


def main() -> None:
    c = httpx.Client(base_url=BASE, timeout=30)
    a, ah = register(c, "Gurpreet", "farmer", "hi")
    b, bh = register(c, "Neighbour", "farmer", "en")
    _, hh = register(c, "Son", "helper", "en")
    c.post("/api/family/link", json={"code": a["link_code"]}, headers=hh)
    c.put("/api/farm", json={"latitude": LAT, "longitude": LON, "current_crop": "potato"}, headers=ah)
    c.put("/api/farm", json={"latitude": LAT + 0.018, "longitude": LON, "current_crop": "potato"}, headers=bh)

    risk = c.get("/api/radar/weather-risk", headers=ah).json()
    print(f"weather ({risk['mode']}, {risk['source']}):", ", ".join(f"{r['disease'].split('___')[1]}={r['risk']}" for r in risk["risks"]))

    print("seed:", c.post("/api/radar/demo/seed", json={"disease": "Potato___Late_blight", "farms": 7}, headers=ah).json())
    print("analyze:", c.post("/api/radar/analyze", headers=ah).json())
    for o in c.get("/api/radar/near-me", headers=ah).json()["outbreaks"]:
        print(f"  outbreak: {o['disease']} level={o['level']} farms={o['farm_count']} risk={o['weather_risk']} "
              f"dist={o['distance_km']} km demo={o['is_demo']}")
    for who, h in (("farmer A (hi)", ah), ("neighbour B (en)", bh), ("helper of A (en)", hh)):
        items = [n for n in c.get("/api/notifications", headers=h).json()["items"] if n["kind"] == "radar"]
        print(f"  {who}: {items[0]['text'] if items else '— no radar alert —'}")
    print("cleanup:", c.delete("/api/radar/demo", headers=ah).json())


if __name__ == "__main__":
    main()
