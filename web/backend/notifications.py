from fastapi import APIRouter, Request

import db
from auth import require_user_id

ANNOUNCEMENT_LIMIT = 20

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(request: Request):
    user_id = require_user_id(request)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.id, a.title, a.body, a.created_at, (ar.user_id IS NOT NULL) AS read
                FROM announcements a
                LEFT JOIN announcement_reads ar
                    ON ar.announcement_id = a.id AND ar.user_id = %s
                ORDER BY a.created_at DESC
                LIMIT %s
                """,
                (user_id, ANNOUNCEMENT_LIMIT),
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
            }
            for row in rows
        ]
    }


@router.post("/{notification_id}/read")
def mark_read(notification_id: int, request: Request):
    user_id = require_user_id(request)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO announcement_reads (announcement_id, user_id)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (notification_id, user_id),
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
    return {"ok": True}
