import io
import os
import pathlib
import re
import secrets

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from PIL import Image, ImageOps

import db
from auth import SESSION_COOKIE_NAME, require_user_id
from ratelimit import check_rate_limit

DISPLAY_NAME_MAX_LENGTH = 100

# Local-dev fallback: a folder next to this file, created on demand.
# In docker-compose this is overridden to a real named volume mount —
# see AVATAR_UPLOAD_DIR in docker-compose.yml's backend.environment.
AVATAR_UPLOAD_DIR = pathlib.Path(
    os.environ.get("AVATAR_UPLOAD_DIR", str(pathlib.Path(__file__).resolve().parent / "uploads" / "avatars"))
)
AVATAR_MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB, before any resizing
AVATAR_MAX_PIXELS = 40_000_000  # guard against decompression-bomb-style images
AVATAR_OUTPUT_SIZE = 256
AVATAR_FILENAME_PATTERN = re.compile(r"^[0-9a-f]{32}\.jpg$")
# The URL this app itself serves avatars at (see the GET route below) —
# used to recognize "this is a file we own and can delete" vs. a
# provider photo URL, which we never touch.
AVATAR_URL_PREFIX = "/api/account/uploads/avatars/"

router = APIRouter(prefix="/account", tags=["account"])


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=DISPLAY_NAME_MAX_LENGTH)
    use_provider_avatar: bool | None = None


def _user_dict(row) -> dict:
    user_id, display_name, avatar_url, provider_avatar_url, email = row
    return {
        "id": user_id,
        "display_name": display_name,
        "avatar_url": avatar_url,
        "provider_avatar_url": provider_avatar_url,
        "email": email,
    }


def _fetch_user(cur, user_id: int) -> dict:
    cur.execute(
        "SELECT id, display_name, avatar_url, provider_avatar_url, email FROM users WHERE id = %s",
        (user_id,),
    )
    return _user_dict(cur.fetchone())


def _delete_avatar_file_if_owned(avatar_url: str | None) -> None:
    """Best-effort cleanup — only ever unlinks a file this app itself
    wrote (matched by URL prefix + filename shape), never a provider
    photo URL, which this app doesn't own and can't delete anyway.
    """
    if not avatar_url or not avatar_url.startswith(AVATAR_URL_PREFIX):
        return
    filename = avatar_url[len(AVATAR_URL_PREFIX):]
    if not AVATAR_FILENAME_PATTERN.match(filename):
        return
    (AVATAR_UPLOAD_DIR / filename).unlink(missing_ok=True)


def _process_avatar_image(raw: bytes) -> bytes:
    """Never trusts the original bytes as-is: verifies it's really an
    image, then decodes and re-encodes from scratch. The output file
    contains nothing but the pixels Pillow decoded — no EXIF, no XMP,
    no non-pixel payload smuggled into the original, and no chance of
    a disguised non-image file (a renamed .html/.php, a polyglot)
    reaching disk regardless of what the client claimed.
    """
    try:
        probe = Image.open(io.BytesIO(raw))
        probe.verify()
    except Exception as exc:
        raise ValueError("That doesn't look like a valid image") from exc

    # verify() leaves the handle unusable for further operations —
    # re-open a fresh one for the real decode.
    img = Image.open(io.BytesIO(raw))
    if img.width * img.height > AVATAR_MAX_PIXELS:
        raise ValueError("Image resolution is too large")

    img = ImageOps.exif_transpose(img)  # apply orientation before EXIF is stripped
    img = img.convert("RGB")
    img = ImageOps.fit(img, (AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE), Image.LANCZOS)

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=85)
    return out.getvalue()


@router.patch("/profile")
def update_profile(req: ProfileUpdate, request: Request):
    user_id = require_user_id(request)

    name = None
    if req.display_name is not None:
        name = req.display_name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Display name can't be empty")

    old_avatar_url = None
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            if name is not None:
                cur.execute("UPDATE users SET display_name = %s WHERE id = %s", (name, user_id))

            if req.use_provider_avatar is not None:
                cur.execute("SELECT avatar_url FROM users WHERE id = %s", (user_id,))
                old_avatar_url = cur.fetchone()[0]
                if req.use_provider_avatar:
                    cur.execute(
                        "UPDATE users SET avatar_url = provider_avatar_url WHERE id = %s", (user_id,)
                    )
                else:
                    cur.execute("UPDATE users SET avatar_url = NULL WHERE id = %s", (user_id,))

            user = _fetch_user(cur, user_id)

    _delete_avatar_file_if_owned(old_avatar_url)
    return {"user": user}


@router.post("/avatar")
def upload_avatar(request: Request, file: UploadFile = File(...)):
    check_rate_limit(request)
    user_id = require_user_id(request)

    raw = file.file.read(AVATAR_MAX_UPLOAD_BYTES + 1)
    if len(raw) > AVATAR_MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large (max 8MB)")

    try:
        processed = _process_avatar_image(raw)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{secrets.token_hex(16)}.jpg"
    (AVATAR_UPLOAD_DIR / filename).write_bytes(processed)
    new_avatar_url = f"{AVATAR_URL_PREFIX}{filename}"

    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT avatar_url FROM users WHERE id = %s", (user_id,))
            old_avatar_url = cur.fetchone()[0]
            cur.execute("UPDATE users SET avatar_url = %s WHERE id = %s", (new_avatar_url, user_id))
            user = _fetch_user(cur, user_id)

    _delete_avatar_file_if_owned(old_avatar_url)
    return {"user": user}


@router.get("/uploads/avatars/{filename}")
def get_avatar(filename: str):
    if not AVATAR_FILENAME_PATTERN.match(filename):
        raise HTTPException(status_code=404)
    path = AVATAR_UPLOAD_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404)
    return FileResponse(
        path,
        media_type="image/jpeg",
        # Safe to cache aggressively — every upload gets a brand-new
        # filename, so this exact URL's content never changes.
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.delete("")
def delete_account(request: Request):
    user_id = require_user_id(request)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT avatar_url FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            old_avatar_url = row[0] if row else None
            # Cascades to oauth_identities and sessions via existing FKs
            # — every session across every device is invalidated in the
            # same statement.
            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))

    _delete_avatar_file_if_owned(old_avatar_url)

    response = JSONResponse({"deleted": True})
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return response
