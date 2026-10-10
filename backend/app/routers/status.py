"""System status: LIVE / FALLBACK mode of every provider."""
from __future__ import annotations

from fastapi import APIRouter

from ..config import get_settings
from ..providers.registry import all_status

router = APIRouter(prefix="/api", tags=["status"])


@router.get("/health")
def health():
    s = get_settings()
    return {"status": "ok", "app": s.app_name, "version": s.version}


@router.get("/status")
def status():
    providers = all_status()
    live = sum(1 for p in providers if p["mode"] == "live")
    return {
        "force_fallback": get_settings().force_fallback,
        "summary": {"live": live, "fallback": len(providers) - live, "total": len(providers)},
        "providers": providers,
    }
