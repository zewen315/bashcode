from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import db
from auth import SESSION_COOKIE_NAME, require_user_id

DISPLAY_NAME_MAX_LENGTH = 100

router = APIRouter(prefix="/account", tags=["account"])


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=DISPLAY_NAME_MAX_LENGTH)
    use_provider_avatar: bool | None = None


@router.patch("/profile")
def update_profile(req: ProfileUpdate, request: Request):
    user_id = require_user_id(request)

    name = None
    if req.display_name is not None:
        name = req.display_name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Display name can't be empty")

    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            if name is not None:
                cur.execute("UPDATE users SET display_name = %s WHERE id = %s", (name, user_id))
            if req.use_provider_avatar is True:
                cur.execute(
                    "UPDATE users SET avatar_url = provider_avatar_url WHERE id = %s", (user_id,)
                )
            elif req.use_provider_avatar is False:
                cur.execute("UPDATE users SET avatar_url = NULL WHERE id = %s", (user_id,))

            cur.execute(
                "SELECT id, display_name, avatar_url, email FROM users WHERE id = %s",
                (user_id,),
            )
            row = cur.fetchone()

    user_id, display_name, avatar_url, email = row
    return {"user": {"id": user_id, "display_name": display_name, "avatar_url": avatar_url, "email": email}}


@router.delete("")
def delete_account(request: Request):
    user_id = require_user_id(request)
    # Cascades to oauth_identities and sessions via existing FKs — every
    # session across every device is invalidated in the same statement.
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))

    response = JSONResponse({"deleted": True})
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return response
