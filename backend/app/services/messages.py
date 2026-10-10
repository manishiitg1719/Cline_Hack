"""Pre-written multi-language message templates (shared with the frontend).

Templates live in `shared/messages/` so backend and frontend produce identical text.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote

SHARED_DIR = Path(__file__).resolve().parents[3] / "shared" / "messages"
LANGS = ("en", "hi")
_PLACEHOLDER = re.compile(r"\{(\w+)\}")

# param type -> dictionary section used to translate the value
_DICT_SECTION = {"crop": "crops", "item": "items", "issue": "issues", "risk": "risk"}


@lru_cache
def _load(name: str) -> dict:
    return json.loads((SHARED_DIR / f"{name}.json").read_text(encoding="utf-8"))


def catalog() -> dict:
    return _load("templates")


def _meta(template_id: str) -> dict | None:
    cat = catalog()
    for t in cat["quick"] + cat["alerts"]:
        if t["id"] == template_id:
            return t
    return None


def render(template_id: str, params: dict | None, lang: str) -> str:
    """Render a template in `lang`, translating dictionary-backed params (crop, item...)."""
    if lang not in LANGS:
        lang = "en"
    meta = _meta(template_id)
    if meta is None:
        raise KeyError(f"Unknown template: {template_id}")
    strings = _load(lang)
    text = strings["templates"][template_id]["text"]
    params = params or {}

    def sub(match: re.Match) -> str:
        key = match.group(1)
        value = params.get(key, "")
        section = _DICT_SECTION.get(meta["params"].get(key, ""))
        if section and isinstance(value, str):
            value = strings[section].get(value, value)
        return str(value)

    rendered = _PLACEHOLDER.sub(sub, text)
    # collapse leftover spaces / dangling punctuation from empty optional params
    return re.sub(r"\s{2,}", " ", rendered).strip()


def title(template_id: str, lang: str) -> str:
    lang = lang if lang in LANGS else "en"
    return _load(lang)["templates"][template_id]["title"]


def whatsapp_link(text: str, phone: str | None = None) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if digits and len(digits) == 10:  # assume India
        digits = "91" + digits
    return f"https://wa.me/{digits}?text={quote(text)}" if digits else f"https://wa.me/?text={quote(text)}"


def sms_link(text: str, phone: str | None = None) -> str:
    return f"sms:{phone or ''}?body={quote(text)}"
