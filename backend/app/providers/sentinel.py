"""Sentinel-2 L2A (10 m) field statistics from Microsoft Planetary Computer — free, no key, plain HTTP.

* STAC search → recent low-cloud scenes covering the farm point.
* Server-side zonal statistics (TiTiler) inside a ~330 m box around the farm:
  SCL (scene classification, to skip scenes where the FIELD is cloudy), NDVI = (B08−B04)/(B08+B04),
  NDMI = (B8A−B11)/(B8A+B11) (leaf water content).
"""
from __future__ import annotations

from datetime import date, timedelta

import httpx

STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
STATS = "https://planetarycomputer.microsoft.com/api/data/v1/item/statistics"
HALF_BOX_DEG = 0.0015       # ≈ 330 m × 330 m
CLEAR_SCL = (4, 5)          # 4 = vegetation, 5 = bare soil; others = cloud/shadow/water/snow
NDVI = "(B08-B04)/(B08+B04)"
NDMI = "(B8A-B11)/(B8A+B11)"


def field_polygon(lat: float, lon: float, d: float = HALF_BOX_DEG) -> dict:
    ring = [[lon - d, lat - d], [lon + d, lat - d], [lon + d, lat + d], [lon - d, lat + d], [lon - d, lat - d]]
    return {"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": [ring]}}


def search_scenes(client: httpx.Client, lat: float, lon: float, days: int, max_cloud: int = 40) -> list[dict]:
    end = date.today()
    body = {
        "collections": ["sentinel-2-l2a"], "intersects": {"type": "Point", "coordinates": [lon, lat]},
        "datetime": f"{(end - timedelta(days=days)).isoformat()}/{end.isoformat()}", "limit": 60,
        "query": {"eo:cloud_cover": {"lt": max_cloud}}, "sortby": [{"field": "properties.datetime", "direction": "desc"}],
    }
    r = client.post(STAC, json=body, timeout=30)
    r.raise_for_status()
    return [{"id": f["id"], "date": f["properties"]["datetime"][:10], "cloud": f["properties"]["eo:cloud_cover"]}
            for f in r.json()["features"]]


def zonal(client: httpx.Client, item: str, expression: str, poly: dict) -> dict:
    params = {"collection": "sentinel-2-l2a", "item": item, "expression": expression, "asset_as_band": "true", "max_size": 128}
    r = client.post(STATS, params=params, json=poly, timeout=45)
    r.raise_for_status()
    return next(iter(r.json()["properties"]["statistics"].values()))


def clear_fraction(scl: dict) -> float:
    """Share of field pixels classed as vegetation/bare soil (histogram bins of the SCL band)."""
    counts, edges = scl["histogram"]
    total = sum(counts) or 1
    clear = sum(c for c, lo, hi in zip(counts, edges, edges[1:]) if any(lo <= v < hi or (v == edges[-1] == hi) for v in CLEAR_SCL))
    return clear / total


def low_ndvi_pct(ndvi: dict, threshold: float = 0.25) -> int:
    counts, edges = ndvi["histogram"]
    total = sum(counts) or 1
    return round(100 * sum(c for c, hi in zip(counts, edges[1:]) if hi <= threshold + 1e-9) / total)


def fetch_series(lat: float, lon: float, months: int = 6, max_points: int = 7) -> dict | None:
    """Latest clear scene (NDVI, NDMI, patchiness) + one NDVI point per month. None if nothing clear."""
    poly = field_polygon(lat, lon)
    series, latest, used = [], None, set()
    with httpx.Client() as client:
        for sc in search_scenes(client, lat, lon, days=months * 31):
            month = sc["date"][:7]
            if month in used or len(series) >= max_points:
                continue
            if clear_fraction(zonal(client, sc["id"], "SCL", poly)) < 0.8:
                continue
            ndvi = zonal(client, sc["id"], NDVI, poly)
            point = {"date": sc["date"], "ndvi": round(ndvi["mean"], 3)}
            if latest is None:
                ndmi = zonal(client, sc["id"], NDMI, poly)
                latest = {**point, "ndmi": round(ndmi["mean"], 3), "ndvi_std": round(ndvi["std"], 3),
                          "low_patch_pct": low_ndvi_pct(ndvi), "scene": sc["id"], "scene_cloud": round(sc["cloud"], 1)}
            series.append(point)
            used.add(month)
    if latest is None:
        return None
    return {"latest": latest, "series": sorted(series, key=lambda p: p["date"])}
