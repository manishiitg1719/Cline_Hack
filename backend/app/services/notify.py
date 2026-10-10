"""Create in-app notifications for a farmer and (optionally) all their linked helpers."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import HelperLink, Notification


def notify(
    db: Session,
    user_id: int,
    kind: str,
    template_id: str,
    params: dict | None = None,
    severity: str = "info",
    include_helpers: bool = False,
    commit: bool = True,
) -> list[Notification]:
    """Store a notification; the text is rendered per-recipient language when listed."""
    recipients = [user_id]
    if include_helpers:
        recipients += list(db.scalars(select(HelperLink.helper_id).where(HelperLink.farmer_id == user_id)))
    created = []
    for rid in dict.fromkeys(recipients):  # de-duplicate, keep order
        n = Notification(user_id=rid, kind=kind, template_id=template_id, params=params or {}, severity=severity)
        db.add(n)
        created.append(n)
    if commit:
        db.commit()
    return created
