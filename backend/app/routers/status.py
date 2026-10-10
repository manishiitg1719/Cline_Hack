"""System status: LIVE / FALLBACK mode of every provider."""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from ..config import get_settings
from ..providers.registry import all_status

router = APIRouter(prefix="/api", tags=["status"])
root_router = APIRouter(tags=["status"])


@root_router.get("/", response_class=HTMLResponse, include_in_schema=False)
def root():
    """Friendly page when someone opens the backend port in a browser (instead of 404)."""
    return """<!doctype html><meta charset=utf-8><title>FarmGuard API</title>
<body style="font-family:system-ui;max-width:640px;margin:40px auto;line-height:1.5">
<h1>🌾 FarmGuard API is running ✅</h1>
<p>This is the <b>backend</b> (port 8000). The app itself is the <b>frontend</b>:
open <a href="http://localhost:5173">http://localhost:5173</a>.</p>
<p>API docs: <a href="/docs">/docs</a> · Health: <a href="/api/health">/api/health</a> · Status: <a href="/api/status">/api/status</a></p>
</body>"""


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
