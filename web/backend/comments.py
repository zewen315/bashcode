import os
import pathlib
import sys

import yaml
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

import db
import notify
from auth import get_user_id_or_none, require_user_id

MAX_BODY_LENGTH = 10_000
FEED_PAGE_SIZE = 20

# Mirrors main.py's PROBLEMS_DIR exactly. Duplicated rather than
# imported from main — main.py imports this module (`import comments`),
# so importing back from main would be circular. Only used here to
# resolve a slug to its problem title for the discussions feed.
REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
DEFAULT_PROBLEMS_DIR = REPO_ROOT / "bashcode-problems"
PROBLEMS_DIR = pathlib.Path(os.environ.get("BASHCODE_PROBLEMS_DIR", DEFAULT_PROBLEMS_DIR))

router = APIRouter(tags=["comments"])


class CommentCreate(BaseModel):
    body: str
    parent_id: int | None = None


class VoteRequest(BaseModel):
    value: int = Field(ge=-1, le=1)


def _problem_title(slug: str) -> str | None:
    config_path = PROBLEMS_DIR / slug / "config.yaml"
    if not config_path.is_file():
        return None
    return yaml.safe_load(config_path.read_text()).get("title")


def _author_dict(user_row_id, display_name, avatar_url, public_id) -> dict:
    """user_row_id is NULL when the comment's author account has been
    deleted (comments.user_id is ON DELETE SET NULL, not CASCADE, so
    the comment itself survives) — synthesize a "deleted user" author
    rather than dropping the comment or leaking a null name. Checked
    against the joined user row's id, not display_name's own
    truthiness, since a real user could in principle have a blank name.
    """
    if user_row_id is None:
        return {"display_name": "deleted user", "avatar_url": None, "public_id": None}
    return {"display_name": display_name, "avatar_url": avatar_url, "public_id": public_id}


def _fetch_comments(slug: str, user_id: int | None) -> list[dict]:
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT c.id, c.parent_id, c.body, c.deleted_at, c.created_at,
                       u.id, u.display_name, u.avatar_url, u.public_id,
                       COUNT(*) FILTER (WHERE cv.value = 1) AS upvotes,
                       COUNT(*) FILTER (WHERE cv.value = -1) AS downvotes,
                       (SELECT value FROM comment_votes
                        WHERE comment_id = c.id AND user_id = %s) AS my_vote
                FROM comments c
                LEFT JOIN users u ON u.id = c.user_id
                LEFT JOIN comment_votes cv ON cv.comment_id = c.id
                WHERE c.slug = %s
                GROUP BY c.id, u.id, u.display_name, u.avatar_url, u.public_id
                ORDER BY c.created_at ASC
                """,
                (user_id, slug),
            )
            rows = cur.fetchall()

    by_id: dict[int, dict] = {}
    top_level: list[dict] = []
    for row in rows:
        (cid, parent_id, body, deleted_at, created_at, user_row_id, display_name, avatar_url, public_id,
         upvotes, downvotes, my_vote) = row
        item = {
            "id": cid,
            "body": body,
            "deleted": deleted_at is not None,
            "created_at": int(created_at.timestamp() * 1000),
            "author": _author_dict(user_row_id, display_name, avatar_url, public_id),
            "upvotes": upvotes,
            "downvotes": downvotes,
            "my_vote": my_vote,
            "replies": [],
        }
        by_id[cid] = item
        if parent_id is None:
            top_level.append(item)
        else:
            parent = by_id.get(parent_id)
            if parent is not None:
                parent["replies"].append(item)

    top_level.sort(key=lambda c: c["created_at"], reverse=True)
    return top_level


@router.get("/problems/{slug}/comments")
def list_comments(slug: str, request: Request):
    user_id = get_user_id_or_none(request)
    return _fetch_comments(slug, user_id)


@router.post("/problems/{slug}/comments")
def create_comment(slug: str, req: CommentCreate, request: Request):
    user_id = require_user_id(request)
    body = req.body.strip()
    if not body:
        raise HTTPException(status_code=400, detail="comment body is empty")
    if len(body) > MAX_BODY_LENGTH:
        raise HTTPException(status_code=400, detail="comment body is too long")

    parent_author_id = None
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            if req.parent_id is not None:
                cur.execute(
                    "SELECT slug, parent_id, user_id FROM comments WHERE id = %s", (req.parent_id,)
                )
                parent = cur.fetchone()
                if parent is None or parent[0] != slug:
                    raise HTTPException(status_code=400, detail="parent comment not found")
                if parent[1] is not None:
                    raise HTTPException(status_code=400, detail="replies cannot be nested further")
                parent_author_id = parent[2]

            cur.execute(
                """
                INSERT INTO comments (slug, user_id, parent_id, body)
                VALUES (%s, %s, %s, %s)
                RETURNING id, created_at
                """,
                (slug, user_id, req.parent_id, body),
            )
            new_id, created_at = cur.fetchone()
            cur.execute(
                "SELECT display_name, avatar_url, public_id FROM users WHERE id = %s", (user_id,)
            )
            display_name, avatar_url, public_id = cur.fetchone()
        conn.commit()

    # Best-effort: notify the parent comment's author that they got a
    # reply. Never the replier themselves, and never a deleted account
    # (parent_author_id is NULL after 0013's ON DELETE SET NULL).
    if parent_author_id is not None and parent_author_id != user_id:
        try:
            notify.create_notification(
                parent_author_id,
                "New reply",
                f"{display_name or 'Someone'} replied to your comment on {_problem_title(slug) or slug}.",
                link=f"/problems/{slug}?tab=discussion",
            )
        except Exception as exc:  # noqa: BLE001
            print(f"Failed to create reply notification for user {parent_author_id}: {exc}", file=sys.stderr)

    return {
        "id": new_id,
        "body": body,
        "deleted": False,
        "created_at": int(created_at.timestamp() * 1000),
        "author": {"display_name": display_name, "avatar_url": avatar_url, "public_id": public_id},
        "upvotes": 0,
        "downvotes": 0,
        "my_vote": None,
        "replies": [],
    }


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, request: Request):
    user_id = require_user_id(request)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE comments SET deleted_at = now(), body = '[deleted]'
                WHERE id = %s AND user_id = %s AND deleted_at IS NULL
                RETURNING id
                """,
                (comment_id, user_id),
            )
            row = cur.fetchone()
        conn.commit()
    if row is None:
        raise HTTPException(status_code=404, detail="comment not found")
    return {"ok": True}


@router.post("/comments/{comment_id}/vote")
def vote_comment(comment_id: int, req: VoteRequest, request: Request):
    user_id = require_user_id(request)
    if req.value not in (1, -1):
        raise HTTPException(status_code=400, detail="value must be 1 or -1")
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT slug, user_id FROM comments WHERE id = %s", (comment_id,))
            comment = cur.fetchone()
            if comment is None:
                raise HTTPException(status_code=404, detail="comment not found")
            comment_slug, comment_author_id = comment

            cur.execute(
                "SELECT value FROM comment_votes WHERE comment_id = %s AND user_id = %s",
                (comment_id, user_id),
            )
            previous = cur.fetchone()
            previous_value = previous[0] if previous else None

            cur.execute(
                """
                INSERT INTO comment_votes (comment_id, user_id, value)
                VALUES (%s, %s, %s)
                ON CONFLICT (comment_id, user_id) DO UPDATE SET value = EXCLUDED.value
                """,
                (comment_id, user_id, req.value),
            )
        conn.commit()

    # Best-effort: notify on a genuine new like only — not a re-click
    # of an already-active like, never on dislikes, never naming the
    # liker (unlike reply notifications, which do name the replier).
    is_new_like = req.value == 1 and previous_value != 1
    if is_new_like and comment_author_id is not None and comment_author_id != user_id:
        try:
            notify.create_notification(
                comment_author_id,
                "New like",
                "Your comment received a like.",
                link=f"/problems/{comment_slug}?tab=discussion",
            )
        except Exception as exc:  # noqa: BLE001
            print(f"Failed to create like notification for user {comment_author_id}: {exc}", file=sys.stderr)

    return {"ok": True}


@router.delete("/comments/{comment_id}/vote")
def unvote_comment(comment_id: int, request: Request):
    user_id = require_user_id(request)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM comment_votes WHERE comment_id = %s AND user_id = %s",
                (comment_id, user_id),
            )
        conn.commit()
    return {"ok": True}


@router.get("/discussions")
def discussions_feed(request: Request, before: int | None = None):
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT c.id, c.slug, c.body, c.created_at,
                       u.id, u.display_name, u.avatar_url, u.public_id,
                       COUNT(*) FILTER (WHERE cv.value = 1) AS upvotes,
                       COUNT(*) FILTER (WHERE cv.value = -1) AS downvotes,
                       (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id) AS reply_count
                FROM comments c
                LEFT JOIN users u ON u.id = c.user_id
                LEFT JOIN comment_votes cv ON cv.comment_id = c.id
                WHERE c.parent_id IS NULL AND c.deleted_at IS NULL
                  AND (%s::bigint IS NULL OR c.id < %s)
                GROUP BY c.id, u.id, u.display_name, u.avatar_url, u.public_id
                ORDER BY c.id DESC
                LIMIT %s
                """,
                (before, before, FEED_PAGE_SIZE),
            )
            rows = cur.fetchall()

    items = []
    for row in rows:
        (cid, slug, body, created_at, user_row_id, display_name, avatar_url, public_id,
         upvotes, downvotes, reply_count) = row
        excerpt = body if len(body) <= 200 else body[:200] + "…"
        items.append({
            "id": cid,
            "slug": slug,
            "problem_title": _problem_title(slug),
            "excerpt": excerpt,
            "created_at": int(created_at.timestamp() * 1000),
            "author": _author_dict(user_row_id, display_name, avatar_url, public_id),
            "upvotes": upvotes,
            "downvotes": downvotes,
            "reply_count": reply_count,
        })

    next_cursor = items[-1]["id"] if len(items) == FEED_PAGE_SIZE else None
    return {"items": items, "next_cursor": next_cursor}
