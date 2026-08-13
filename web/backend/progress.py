from datetime import datetime, timezone

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

import db
from auth import require_user_id

ACTIVITY_LIMIT = 15  # matches web/frontend/src/lib/local-progress.ts's ACTIVITY_LIMIT

router = APIRouter(prefix="/progress", tags=["progress"])


class ImportEntry(BaseModel):
    slug: str
    verdict: str
    at: int  # epoch ms, matching local-progress.ts's ActivityEntry


class ImportRequest(BaseModel):
    starred: list[str] = Field(default_factory=list)
    activity: list[ImportEntry] = Field(default_factory=list)


@router.get("")
def get_progress(request: Request):
    user_id = require_user_id(request)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT slug FROM submissions WHERE user_id = %s", (user_id,))
            attempted = [row[0] for row in cur.fetchall()]

            cur.execute(
                "SELECT DISTINCT slug FROM submissions WHERE user_id = %s AND verdict = 'Accepted'",
                (user_id,),
            )
            solved = [row[0] for row in cur.fetchall()]

            cur.execute(
                """
                SELECT slug, verdict, submitted_at FROM submissions
                WHERE user_id = %s ORDER BY submitted_at DESC LIMIT %s
                """,
                (user_id, ACTIVITY_LIMIT),
            )
            activity = [
                {"slug": row[0], "verdict": row[1], "at": int(row[2].timestamp() * 1000)}
                for row in cur.fetchall()
            ]

            cur.execute("SELECT slug FROM starred_problems WHERE user_id = %s", (user_id,))
            starred = [row[0] for row in cur.fetchall()]

    return {"solved": solved, "starred": starred, "attempted": attempted, "activity": activity}


@router.post("/star/{slug}")
def star_problem(slug: str, request: Request):
    user_id = require_user_id(request)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO starred_problems (user_id, slug) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (user_id, slug),
            )
    return {"ok": True}


@router.delete("/star/{slug}")
def unstar_problem(slug: str, request: Request):
    user_id = require_user_id(request)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM starred_problems WHERE user_id = %s AND slug = %s", (user_id, slug)
            )
    return {"ok": True}


@router.delete("/submissions")
def reset_submissions(request: Request):
    user_id = require_user_id(request)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM submissions WHERE user_id = %s", (user_id,))
    return {"ok": True}


@router.post("/import")
def import_progress(req: ImportRequest, request: Request):
    """Merges a device's local (anonymous-mode) progress into the
    account on login. Safe to call more than once for the same data —
    submissions dedupe via the schema's UNIQUE constraint, starred via
    ON CONFLICT DO NOTHING — since a given browser only ever clears
    localStorage after a successful import, but shouldn't corrupt
    anything if it were ever retried anyway.
    """
    user_id = require_user_id(request)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            for entry in req.activity:
                submitted_at = datetime.fromtimestamp(entry.at / 1000, tz=timezone.utc)
                cur.execute(
                    """
                    INSERT INTO submissions (user_id, slug, verdict, submitted_at)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (user_id, entry.slug, entry.verdict, submitted_at),
                )
            for slug in req.starred:
                cur.execute(
                    "INSERT INTO starred_problems (user_id, slug) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (user_id, slug),
                )
    return {"ok": True}
