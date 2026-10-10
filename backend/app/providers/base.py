"""LIVE / FALLBACK provider framework.

Every external service is wrapped in a Provider. A provider is LIVE when it is
configured, enabled and its last call succeeded; otherwise callers use the
fallback path. Every result carries `mode` and `source` so the UI can show a badge.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

from ..config import get_settings

Mode = Literal["live", "fallback"]


@dataclass
class ProviderResult:
    data: Any
    mode: Mode
    source: str
    note: str = ""

    def envelope(self) -> dict:
        return {"mode": self.mode, "source": self.source, "note": self.note, "data": self.data}


@dataclass
class ProviderState:
    last_ok: datetime | None = None
    last_error: str = ""
    last_checked: datetime | None = None


@dataclass
class Provider:
    """Base provider. Subclasses set name/label and implement `configured()`."""

    name: str
    label: str
    live_source: str
    fallback_source: str
    needs_key: bool = False
    state: ProviderState = field(default_factory=ProviderState)

    def configured(self) -> tuple[bool, str]:  # pragma: no cover - overridden
        return True, ""

    def is_live(self) -> tuple[bool, str]:
        """Should callers *attempt* the live path? (configured and not forced off)"""
        if get_settings().force_fallback:
            return False, "FORCE_FALLBACK is on"
        return self.configured()

    def _last_call_failed(self) -> bool:
        s = self.state
        return bool(s.last_error) and (s.last_ok is None or (s.last_checked is not None and s.last_checked > s.last_ok))

    def mark_ok(self) -> None:
        now = datetime.now(timezone.utc)
        self.state.last_ok = now
        self.state.last_checked = now
        self.state.last_error = ""

    def mark_error(self, err: str) -> None:
        self.state.last_checked = datetime.now(timezone.utc)
        self.state.last_error = err[:200]

    def status(self) -> dict:
        live, reason = self.is_live()
        mode: Mode = "live" if live else "fallback"
        if live and self._last_call_failed():
            mode = "fallback"
            reason = f"Last call failed: {self.state.last_error} (retrying automatically)"
        return {
            "name": self.name,
            "label": self.label,
            "mode": mode,
            "source": self.live_source if mode == "live" else self.fallback_source,
            "reason": reason,
            "needs_key": self.needs_key,
            "last_ok": self.state.last_ok.isoformat() if self.state.last_ok else None,
            "last_checked": self.state.last_checked.isoformat() if self.state.last_checked else None,
        }

    def live(self, data: Any, note: str = "") -> ProviderResult:
        self.mark_ok()
        return ProviderResult(data, "live", self.live_source, note)

    def fallback(self, data: Any, note: str = "") -> ProviderResult:
        return ProviderResult(data, "fallback", self.fallback_source, note)
