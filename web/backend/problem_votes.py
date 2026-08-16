from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

import db
from auth import get_user_id_or_none, require_user_id

router = APIRouter(tags=["problem-votes"])


class VoteRequest(BaseModel):
    value: int = Field(ge=-1, le=1)


def vote_counts(slug: str, user_id: int | None) -> dict:
    """Shared by all three routes below, so a vote/unvote can return
    the freshly updated counts in the same response instead of making
    the client re-fetch.
    """
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  COUNT(*) FILTER (WHERE value = 1),
                  COUNT(*) FILTER (WHERE value = -1)
                FROM problem_votes WHERE slug = %s
                """,
                (slug,),
            )
            upvotes, downvotes = cur.fetchone()
            my_vote = None
            if user_id is not None:
                cur.execute(
                    "SELECT value FROM problem_votes WHERE slug = %s AND user_id = %s",
                    (slug, user_id),
                )
                row = cur.fetchone()
                my_vote = row[0] if row else None
    return {"upvotes": upvotes, "downvotes": downvotes, "my_vote": my_vote}


@router.get("/problems/{slug}/vote")
def get_problem_votes(slug: str, request: Request):
    return vote_counts(slug, get_user_id_or_none(request))


@router.post("/problems/{slug}/vote")
def vote_problem(slug: str, req: VoteRequest, request: Request):
    user_id = require_user_id(request)
    if req.value not in (1, -1):
        raise HTTPException(status_code=400, detail="value must be 1 or -1")
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO problem_votes (slug, user_id, value)
                VALUES (%s, %s, %s)
                ON CONFLICT (slug, user_id) DO UPDATE SET value = EXCLUDED.value
                """,
                (slug, user_id, req.value),
            )
        conn.commit()
    return vote_counts(slug, user_id)


@router.delete("/problems/{slug}/vote")
def unvote_problem(slug: str, request: Request):
    user_id = require_user_id(request)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM problem_votes WHERE slug = %s AND user_id = %s",
                (slug, user_id),
            )
        conn.commit()
    return vote_counts(slug, user_id)
