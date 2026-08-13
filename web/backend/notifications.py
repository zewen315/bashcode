from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

import db
from auth import require_user_id

PAGE_SIZE = 20

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(request: Request, before: int | None = None):
    """Merges two different-shaped sources at query time rather than
    unifying them into one schema: announcements are a global
    broadcast (no per-user row, "unread" = "not in announcement_reads
    yet", "removed" = a hidden_at marker in that same join row);
    notifications are personal, one row per (event, recipient) with
    its own read_at, deleted outright on removal. IDs are prefixed
    ("a12"/"n34") so the two id spaces can't collide once combined —
    mark_read/remove below parse the prefix to know which table to
    touch.

    Paginated by created_at (epoch ms), not id — the two source tables
    have independent id sequences, so there's no single monotonic id
    to page on across both, but timestamps are directly comparable.
    Same "next_cursor only if a full page came back" convention as
    the discussions feed (comments.py's discussions_feed).
    """
    user_id = require_user_id(request)
    before_ts = datetime.fromtimestamp(before / 1000, tz=timezone.utc) if before is not None else None
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM (
                    SELECT 'a' || a.id AS id, a.title, a.body, a.created_at,
                           (ar.user_id IS NOT NULL) AS read, NULL::text AS link
                    FROM announcements a
                    LEFT JOIN announcement_reads ar
                        ON ar.announcement_id = a.id AND ar.user_id = %s
                    WHERE ar.hidden_at IS NULL
                    UNION ALL
                    SELECT 'n' || n.id, n.title, n.body, n.created_at,
                           (n.read_at IS NOT NULL), n.link
                    FROM notifications n
                    WHERE n.user_id = %s
                ) combined
                WHERE %s::timestamptz IS NULL OR created_at < %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, user_id, before_ts, before_ts, PAGE_SIZE),
            )
            rows = cur.fetchall()

    next_cursor = int(rows[-1][3].timestamp() * 1000) if len(rows) == PAGE_SIZE else None
    return {
        "notifications": [
            {
                "id": row[0],
                "title": row[1],
                "body": row[2],
                "created_at": row[3].isoformat(),
                "read": row[4],
                "link": row[5],
            }
            for row in rows
        ],
        "next_cursor": next_cursor,
    }


def _parse_id(notification_id: str) -> tuple[str, int]:
    kind, raw_id = notification_id[0], notification_id[1:]
    if kind not in ("a", "n") or not raw_id.isdigit():
        raise HTTPException(status_code=404, detail="notification not found")
    return kind, int(raw_id)


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, request: Request):
    user_id = require_user_id(request)
    kind, raw_id = _parse_id(notification_id)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            if kind == "a":
                cur.execute(
                    """
                    INSERT INTO announcement_reads (announcement_id, user_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (raw_id, user_id),
                )
            else:
                cur.execute(
                    """
                    UPDATE notifications SET read_at = now()
                    WHERE id = %s AND user_id = %s AND read_at IS NULL
                    """,
                    (raw_id, user_id),
                )
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(request: Request):
    user_id = require_user_id(request)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO announcement_reads (announcement_id, user_id)
                SELECT id, %s FROM announcements
                ON CONFLICT DO NOTHING
                """,
                (user_id,),
            )
            cur.execute(
                "UPDATE notifications SET read_at = now() WHERE user_id = %s AND read_at IS NULL",
                (user_id,),
            )
    return {"ok": True}


@router.delete("/{notification_id}")
def remove_notification(notification_id: str, request: Request):
    user_id = require_user_id(request)
    kind, raw_id = _parse_id(notification_id)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            if kind == "a":
                # No per-user row to delete (announcements are a
                # broadcast, not fanned out) — hiding it for just this
                # user is a marker on the same join row mark_read
                # already uses, not a real delete.
                cur.execute(
                    """
                    INSERT INTO announcement_reads (announcement_id, user_id, hidden_at)
                    VALUES (%s, %s, now())
                    ON CONFLICT (announcement_id, user_id)
                    DO UPDATE SET hidden_at = now()
                    """,
                    (raw_id, user_id),
                )
            else:
                cur.execute(
                    "DELETE FROM notifications WHERE id = %s AND user_id = %s",
                    (raw_id, user_id),
                )
    return {"ok": True}
