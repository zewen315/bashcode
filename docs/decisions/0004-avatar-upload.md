# 0004 — Avatar upload

Status: **Implemented and verified locally. Not yet deployed.**

## Context

`docs/decisions/0003-account-settings.md` deliberately scoped avatar
changes down to "toggle provider photo vs. initials," explicitly
ruling out real upload because there was no image storage/upload
infrastructure. The user asked for real upload.

Confirmed via AskUserQuestion: **store files on a droplet-local Docker
volume**, not DigitalOcean Spaces — matches how Postgres data is
already stored (self-hosted, no new external service/credentials to
set up), simplest for V1.

## Design decisions worth knowing (why, not just what)

- **Two new Python dependencies**: `Pillow` (image processing) and
  `python-multipart` (FastAPI requires it for `UploadFile`/multipart
  form parsing) — confirmed neither was already installed before
  adding them.
- **Uploaded images are always decoded and re-encoded, never stored
  byte-for-byte** — a real security property, not just resizing.
  `Image.open(...).verify()` confirms the bytes are actually a valid
  image (rejects disguised/polyglot files regardless of filename or
  claimed Content-Type, neither of which is trusted). Re-saving as a
  fresh JPEG after resize strips all EXIF/metadata and any non-pixel
  payload smuggled into the original file — verified directly: a text
  file renamed to `.jpg` was correctly rejected with 422, not saved.
- **Dimension check before full decode**: Pillow's `Image.open()` is
  lazy (header-only), so `img.width * img.height` is checked and
  rejected before a full decode — a cheap guard against
  decompression-bomb-style images.
- **Server-generated filenames only** (`secrets.token_hex(16)` +
  fixed `.jpg`) — never derived from the client's filename, same
  path-traversal-safety reasoning as the existing `SafeFileName`
  pattern in `main.py` (judge input files). Verified directly: hitting
  the serving route with a path-traversal-shaped filename returns 404,
  not a file.
- **The existing `/api/*` proxy is reused for serving, not a new Caddy
  static-file path** — one new backend route, `GET
  /account/uploads/avatars/{filename}` (filename pattern-validated,
  404 otherwise), and `avatar_url` is stored as the relative path
  `/api/account/uploads/avatars/{filename}`. Resolved by Caddy in prod
  and the existing local-dev Next.js rewrite — zero new infra config
  in either environment. Provider avatar URLs (absolute `https://...`)
  and this relative path coexist fine in the same column.
- **`users.provider_avatar_url` (0003) is untouched by uploads** —
  stays the immutable original OAuth photo, so a user can revert to it
  even after uploading and later removing a custom photo. `/auth/me`
  and `/account/profile` now also return `provider_avatar_url` so the
  frontend can compute which buttons to show.
- **Old uploaded files are deleted on every replacement** — verified
  directly for all four paths: uploading a second photo, reverting to
  the provider photo, removing to initials, and deleting the account
  all leave the uploads directory empty of the previous file
  afterward. Centralized in one helper (`_delete_avatar_file_if_owned`)
  that only unlinks paths matching the app's own uploads URL prefix,
  never a provider URL.
- **Rate limiting only on the upload endpoint** — the one new endpoint
  doing real work (decode, resize, disk I/O), unlike the cheap
  DB-only reads/writes already exempted from rate limiting in 0003.
- **Size cap enforced at the application layer only** (8 MB, read-then-
  reject) — verified directly (a 9 MB random-bytes upload returned
  413). A reverse-proxy body-size cap would be stronger defense in
  depth but isn't needed yet at this app's traffic scale.
- **Fixed square output (256×256, `ImageOps.fit`, cover-crop)** —
  bounds storage/bandwidth regardless of what's uploaded; verified a
  600×300 non-square input came back as exactly 256×256.
- **Local dev needs zero setup**: `AVATAR_UPLOAD_DIR` defaults to a
  folder next to `account.py` when unset, created on demand, gitignored.

## What shipped

- `web/backend/requirements.txt` — `Pillow`, `python-multipart`.
- `web/backend/account.py` — `_process_avatar_image` (verify, guard,
  exif-transpose, resize, re-encode), `_delete_avatar_file_if_owned`,
  `POST /account/avatar`, `GET /account/uploads/avatars/{filename}`;
  existing `update_profile`/`delete_account` now clean up owned files.
- `web/backend/auth.py` — `/me` now also returns `provider_avatar_url`.
- `docker-compose.yml` — new `avatar_uploads` named volume mounted at
  `/app/uploads` in `backend` (a normal named volume, not a host bind
  mount — none of the Docker-outside-of-Docker path-matching
  constraints that apply to the judge's scratch/problems mounts apply
  here), `AVATAR_UPLOAD_DIR=/app/uploads/avatars`.
- `.gitignore` — `web/backend/uploads/`.
- `web/frontend/src/lib/auth.ts` — `AuthUser.provider_avatar_url`.
- `web/frontend/src/lib/account.ts` — `uploadAvatar()`.
- `web/frontend/src/app/settings/page.tsx` — hidden file input +
  "Upload photo" button; the old binary toggle button is now three
  conditionally-shown buttons ("Upload photo" always, "Use my
  GitHub/Google photo" when a provider photo exists and differs from
  current, "Remove photo" whenever an avatar is set).

## Verification

All done against the real local Postgres + local-uvicorn setup (no
live provider consent needed — synthetic session via
`auth._get_or_create_user`, same technique as 0002/0003):

- Real (solid-color, non-square) JPEG upload → confirmed on disk,
  confirmed exactly 256×256 JPEG when re-fetched and decoded.
- Second upload → confirmed the first file was deleted, only the new
  one remains.
- Revert to provider photo → confirmed file deleted,
  `avatar_url == provider_avatar_url`.
- Remove photo → confirmed file deleted, `avatar_url` null.
- Delete account with an avatar attached → confirmed file deleted
  alongside the existing 0003 DB cascade.
- Negative cases: fake image → 422; 9 MB oversized upload → 413;
  path-traversal-shaped filename on the serving route → 404.
- Real browser pass (Playwright, synthetic session cookie): uploaded a
  real file via `page.setInputFiles`, confirmed zero page errors,
  confirmed the avatar `<img>` src updated to the new uploads path,
  confirmed the "Use my profile photo" button appeared and correctly
  reverted the avatar back to the provider URL.

## Explicitly out of scope
- Cropping/positioning UI — server does a centered cover-crop to
  square automatically.
- Multiple photos / photo history.
- Animated avatars (GIF input is accepted but flattened to a static
  JPEG on re-encode, consistent with "always re-encode, never trust
  the original bytes").
- Reverse-proxy-level upload size limits.
