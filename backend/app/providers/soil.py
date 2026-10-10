"""Soil by location: ISRIC SoilGrids v2 (LIVE, free, no key) → typical values for the soil type (FALLBACK).

SoilGrids returns mapped integers; divide by `d_factor` (pH ×10, clay/sand ‰→%/10, SOC dg/kg, N cg/kg).
Values are 250 m modelled ESTIMATES for the area — not a lab test of the exact field.
Some locations (cities, water, gaps) return nulls → fallback.
"""
from __future__ import annotations

import httpx

from .base import ProviderResult
from .registry import get_provider

URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
PROPS = ("phh2o", "clay", "sand", "soc", "nitrogen", "cec")
DEPTHS = ("0-5cm", "5-15cm", "15-30cm")

# Typical topsoil values for major Indian soil groups (NBSS&LUP / ICAR soil descriptions, rounded)
TYPICAL = {
    "alluvial": {"ph": 7.5, "clay": 20, "sand": 40, "soc": 5.0, "nitrogen": 0.6},
    "black": {"ph": 8.0, "clay": 50, "sand": 15, "soc": 6.0, "nitrogen": 0.6},
    "red": {"ph": 6.3, "clay": 25, "sand": 55, "soc": 4.0, "nitrogen": 0.4},
    "laterite": {"ph": 5.5, "clay": 30, "sand": 45, "soc": 8.0, "nitrogen": 0.7},
    "sandy": {"ph": 7.8, "clay": 8, "sand": 80, "soc": 2.0, "nitrogen": 0.2},
    "clay": {"ph": 7.5, "clay": 50, "sand": 15, "soc": 6.0, "nitrogen": 0.6},
    "loamy": {"ph": 7.0, "clay": 20, "sand": 40, "soc": 6.0, "nitrogen": 0.6},
}
DEFAULT_TYPE = "alluvial"


def classify_texture(clay: float, sand: float) -> str:
    """Map clay/sand % to the app's soil-type keys (simplified USDA texture triangle)."""
    if sand >= 70 and clay < 15:
        return "sandy"
    if clay >= 40:
        return "clay"
    if clay < 27 and 23 <= sand <= 52:
        return "loamy"
    return "alluvial" if sand < 52 else "red"


def _fetch(lat: float, lon: float) -> dict | None:
    params = [("lat", lat), ("lon", lon), ("value", "mean")] + [("property", p) for p in PROPS] + [("depth", d) for d in DEPTHS]
    r = httpx.get(URL, params=params, timeout=20)
    r.raise_for_status()
    out = {}
    for layer in r.json()["properties"]["layers"]:
        vals = [d["values"]["mean"] for d in layer["depths"] if d["values"]["mean"] is not None]
        if vals:
            out[layer["name"]] = sum(vals) / len(vals) / layer["unit_measure"]["d_factor"]
    if not {"phh2o", "clay", "sand"} <= out.keys():
        return None  # no data mapped here
    return {
        "ph": round(out["phh2o"], 1), "clay": round(out["clay"]), "sand": round(out["sand"]),
        "soc": round(out.get("soc", 0), 1), "nitrogen": round(out.get("nitrogen", 0), 2),
        "cec": round(out.get("cec", 0), 1),
    }


def get_soil(lat: float, lon: float, soil_type: str = "", fetcher=None) -> ProviderResult:
    """Return {ph, clay, sand, soc (g/kg), nitrogen (g/kg), texture_class}."""
    provider = get_provider("soil")
    fetcher = fetcher or _fetch
    live_ok, reason = provider.is_live()
    if live_ok:
        try:
            data = fetcher(lat, lon)
            if data:
                data["texture_class"] = classify_texture(data["clay"], data["sand"])
                return provider.live(data, note="Modelled estimate for your area (250 m), not a lab test.")
            provider.mark_ok()
            reason = "SoilGrids has no data for this exact spot"
        except Exception as exc:
            provider.mark_error(f"{type(exc).__name__}: {exc}")
            reason = "SoilGrids unreachable"
    key = soil_type if soil_type in TYPICAL else DEFAULT_TYPE
    data = {**TYPICAL[key], "texture_class": key}
    return provider.fallback(data, note=f"{reason}. Using typical values for {key} soil.")
