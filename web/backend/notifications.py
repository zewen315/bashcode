from fastapi import APIRouter, HTTPException, Request

import db
from auth import require_user_id

ANNOUNCEMENT_LIMIT = 20

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(request: Request):
    """Merges two different-shaped sources at query time rather than
    unifying them into one schema: announcements are a global
    broadcast (no per-user row, "unread" = "not in announcement_reads
    yet"); notifications are personal, one row per (event, recipient)
    with its own read_at. IDs are prefixed ("a12"/"n34") so the two id
    spaces can't collide once combined — mark_read below parses the
    prefix to know which table to touch.
    """
    user_id = require_user_id(request)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 'a' || a.id, a.title, a.body, a.created_at,
                       (ar.user_id IS NOT NULL), NULL::text
                FROM announcements a
                LEFT JOIN announcement_reads ar
                    ON ar.announcement_id = a.id AND ar.user_id = %s
                UNION ALL
                SELECT 'n' || n.id, n.title, n.body, n.created_at,
                       (n.read_at IS NOT NULL), n.link
                FROM notifications n
                WHERE n.user_id = %s
                ORDER BY 4 DESC
                LIMIT %s
                """,
                (user_id, user_id, ANNOUNCEMENT_LIMIT),
            )
            rows = cur.fetchall()
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
        ]
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
