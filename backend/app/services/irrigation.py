"""Irrigation decision engine: Irrigate now / Delay / Monitor.

Method (explainable, no sensors needed):
* Crop water need  ETc = Kc × ET0         (FAO-56; Kc = mid-season crop coefficient)
* Soil water status from Open-Meteo modelled soil moisture (3–9 cm, m³/m³) compared with
  typical field capacity (FC) and wilting point (WP) of the farm's soil type:
      available = (θ − WP) / (FC − WP)    → 0 = dry, 1 = full
* Rain forecast in the next 24 h decides whether to wait.

Kc values: FAO Irrigation & Drainage Paper 56, Table 12 (mid-season).
FC/WP: typical values by texture (FAO-56 Table 19 / USDA texture classes).
"""
from __future__ import annotations

# mid-season crop coefficient (FAO-56 Table 12)
KC_MID = {
    "wheat": 1.15, "rice": 1.20, "maize": 1.20, "potato": 1.15, "tomato": 1.15, "soybean": 1.15,
    "cotton": 1.18, "sugarcane": 1.25, "mustard": 1.05, "chickpea": 1.00, "pigeonpea": 1.05,
    "moong": 1.05, "onion": 1.05, "groundnut": 1.15, "bajra": 1.00, "apple": 0.95, "grape": 0.85,
}
DEFAULT_KC = 1.05

# (field capacity, wilting point) volumetric m³/m³
SOIL_WATER = {
    "sandy": (0.12, 0.05), "loamy": (0.27, 0.12), "alluvial": (0.28, 0.13), "red": (0.24, 0.11),
    "laterite": (0.25, 0.12), "black": (0.40, 0.22), "clay": (0.38, 0.22),
}
DEFAULT_SOIL = (0.28, 0.13)

# Allowed depletion before stress (FAO-56 p-value, simplified): irrigate when available < 50 %
IRRIGATE_BELOW = 0.50
COMFORT_ABOVE = 0.70
RAIN_DELAY_PROB = 60       # % chance in next 24 h
RAIN_DELAY_MM = 5.0        # mm expected today/tomorrow that meaningfully refills topsoil

# litres per mm per acre: 1 mm over 1 m² = 1 L; 1 acre = 4046.86 m²
L_PER_MM_ACRE = 4046.86


def decide(weather: dict, crop: str = "", soil_type: str = "", water_source: str = "", area_acres: float | None = None) -> dict:
    """Return decision + numbers + human reasons (as reason codes the UI translates)."""
    crop = (crop or "").lower()
    kc = KC_MID.get(crop, DEFAULT_KC)
    fc, wp = SOIL_WATER.get(soil_type, DEFAULT_SOIL)

    days = weather.get("days", [])
    today = days[0] if days else {}
    tomorrow = days[1] if len(days) > 1 else {}
    et0 = today.get("et0") or 0.0
    etc_today = round(kc * et0, 2)
    week_need_mm = round(sum(kc * (d.get("et0") or 0) for d in days[:7]), 1)
    week_rain_mm = round(sum(d.get("rain_mm") or 0 for d in days[:7]), 1)
    net_week_mm = round(max(week_need_mm - 0.8 * week_rain_mm, 0), 1)  # ~80 % effective rain

    theta = weather.get("soil_moisture")
    available = None
    if theta is not None:
        available = max(0.0, min(1.0, (theta - wp) / (fc - wp)))

    rain_prob = weather.get("rain_prob_24h") or 0
    rain_soon_mm = (today.get("rain_mm") or 0) + (tomorrow.get("rain_mm") or 0)

    reasons: list[str] = []
    if rain_prob >= RAIN_DELAY_PROB or rain_soon_mm >= RAIN_DELAY_MM:
        decision = "delay"
        reasons.append("rain_expected")
    elif available is not None and available < IRRIGATE_BELOW:
        decision = "irrigate"
        reasons.append("soil_dry")
        if etc_today >= 5:
            reasons.append("high_evaporation")
    elif available is None and etc_today >= 5 and rain_prob < 30:
        decision = "irrigate"
        reasons += ["no_soil_data", "high_evaporation"]
    elif available is not None and available >= COMFORT_ABOVE:
        decision = "monitor"
        reasons.append("soil_ok")
    else:
        decision = "monitor"
        reasons.append("soil_moderate" if available is not None else "no_soil_data")

    if water_source == "rain" and decision == "irrigate":
        reasons.append("rainfed_tip")

    out = {
        "decision": decision,
        "reasons": reasons,
        "crop": crop,
        "kc": kc,
        "et0_today_mm": et0,
        "crop_need_today_mm": etc_today,
        "week_need_mm": week_need_mm,
        "week_rain_mm": week_rain_mm,
        "net_irrigation_week_mm": net_week_mm,
        "soil_moisture_pct": round(theta * 100, 1) if theta is not None else None,
        "available_water_pct": round(available * 100) if available is not None else None,
        "rain_prob_24h": rain_prob,
        "soil_type_used": soil_type if soil_type in SOIL_WATER else "default",
    }
    if area_acres:
        out["litres_today"] = round(etc_today * L_PER_MM_ACRE * area_acres)
        out["litres_week"] = round(net_week_mm * L_PER_MM_ACRE * area_acres)
    return out
