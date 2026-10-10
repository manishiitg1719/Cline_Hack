"""Turn satellite indices into a simple, honest field-health reading.

NDVI (greenness): < 0.2 bare/just sown/harvested · 0.2–0.4 sparse or stressed · 0.4–0.6 moderate · > 0.6 dense & healthy.
NDMI (leaf water): < 0 dry / water stress · 0–0.2 moderate · > 0.2 good.
Trend: change vs the previous clear image (a big drop = stress OR harvest — we say both).
"""
from __future__ import annotations


def health_score(ndvi: float) -> int:
    return round(max(0.0, min(1.0, (ndvi - 0.1) / 0.6)) * 100)


def interpret(sat: dict) -> dict:
    latest, series = sat["latest"], sat["series"]
    ndvi, ndmi = latest["ndvi"], latest["ndmi"]
    flags: list[str] = []

    if ndvi < 0.2:
        status = "bare"
        flags.append("bare_or_harvested")
    elif ndvi < 0.4:
        status = "stressed"
    elif ndvi < 0.6:
        status = "moderate"
    else:
        status = "healthy"

    if ndmi < 0:
        flags.append("water_stress")
        if status == "healthy":
            status = "moderate"
    elif ndmi > 0.2:
        flags.append("water_ok")

    change = None
    if len(series) >= 2:
        change = round(series[-1]["ndvi"] - series[-2]["ndvi"], 3)
        if change <= -0.1:
            flags.append("dropping")
        elif change >= 0.1:
            flags.append("growing")
    if latest.get("low_patch_pct", 0) >= 20 and status != "bare":
        flags.append("patchy")

    return {
        "status": status, "score": health_score(ndvi), "ndvi": ndvi, "ndmi": ndmi, "change": change,
        "flags": flags, "image_date": latest["date"], "low_patch_pct": latest.get("low_patch_pct"),
        "series": series,
    }
