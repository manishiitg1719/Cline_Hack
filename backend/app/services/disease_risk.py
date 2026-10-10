"""Weather-driven disease spread risk for the next 3 days (explainable rules).

* Late blight (Phytophthora infestans) — Hutton criteria (UK, 2017, replacing Smith periods):
  a "Hutton day" has minimum temperature ≥ 10 °C and ≥ 6 hours with relative humidity ≥ 90 %.
  Two consecutive Hutton days ⇒ HIGH risk; one ⇒ MEDIUM.
* Other diseases — simplified favourable-condition rules from extension literature
  (leaf wetness ≈ hours with RH ≥ 90 %, temperature windows). ≥ 2 favourable days ⇒ HIGH, 1 ⇒ MEDIUM.
* Viruses spread by touch, wood diseases and HLB are not weather-driven ⇒ LOW (rule "not_weather").
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

KB_DIR = Path(__file__).resolve().parents[3] / "shared" / "disease"

CROP_KEY = {
    "Apple": "apple", "Blueberry": "blueberry", "Cherry_(including_sour)": "cherry", "Corn_(maize)": "maize",
    "Grape": "grape", "Orange": "orange", "Peach": "peach", "Pepper,_bell": "pepper", "Potato": "potato",
    "Raspberry": "raspberry", "Soybean": "soybean", "Squash": "squash", "Strawberry": "strawberry", "Tomato": "tomato",
}


def label_crop(label: str) -> str:
    crop = label.split("___")[0]
    return CROP_KEY.get(crop, crop.lower())


@lru_cache
def disease_labels() -> list[str]:
    """All disease (non-healthy) labels the offline model can report."""
    kb = json.loads((KB_DIR / "kb_en.json").read_text(encoding="utf-8"))
    return list(kb["classes"].keys())


def rule_for(label: str) -> str:
    cond = label.split("___")[-1].lower()
    if "late_blight" in cond:
        return "late_blight"
    if "apple_scab" in cond:
        return "scab"
    if "rust" in cond:
        return "rust"
    if "powdery_mildew" in cond:
        return "mildew"
    if "bacterial_spot" in cond:
        return "bacterial"
    if "spider_mites" in cond:
        return "mites"
    if "yellow_leaf_curl" in cond:
        return "whitefly"
    if any(k in cond for k in ("mosaic", "esca", "haunglongbing")):
        return "not_weather"
    return "fungal_wet"  # early blight, septoria, target spot, leaf mould, grey/northern leaf blight, black rot, scorch…


def _between(v, lo, hi) -> bool:
    return v is not None and lo <= v <= hi


def _favourable(rule: str, d: dict) -> bool:
    t, hh, rain = d.get("t_mean"), d.get("humid_hours") or 0, d.get("rain_mm") or 0
    if rule == "late_blight":
        return (d.get("t_min") or -99) >= 10 and hh >= 6
    if rule == "fungal_wet":
        return _between(t, 15, 30) and (hh >= 6 or rain >= 2)
    if rule == "scab":
        return _between(t, 6, 24) and (rain >= 1 or hh >= 9)
    if rule == "rust":
        return _between(t, 15, 25) and hh >= 4
    if rule == "mildew":
        return _between(t, 18, 30) and rain < 2 and hh >= 2
    if rule == "bacterial":
        return _between(t, 22, 32) and (rain >= 2 or hh >= 6)
    if rule == "mites":
        return (d.get("t_max") or 0) >= 30 and hh <= 2 and rain < 1
    if rule == "whitefly":
        return (t or 0) >= 25 and rain < 2
    return False


def weather_risk(label: str, days: list[dict]) -> dict:
    """Risk of spread over the next 3 forecast days: {'risk': low|medium|high, 'rule', 'favourable_days'}."""
    rule = rule_for(label)
    window = days[:3]
    flags = [_favourable(rule, d) for d in window]
    n = sum(flags)
    if rule == "not_weather":
        risk = "low"
    elif rule == "late_blight":
        consecutive = any(a and b for a, b in zip(flags, flags[1:]))
        risk = "high" if consecutive else ("medium" if n else "low")
    else:
        risk = "high" if n >= 2 else ("medium" if n == 1 else "low")
    return {"risk": risk, "rule": rule, "favourable_days": n}
