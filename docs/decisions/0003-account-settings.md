# 0003 — Account settings: display name, avatar toggle, delete account

Status: **Implemented and verified locally. Not yet deployed.**

## Context

[0002](./0002-oauth-login-sessions.md) shipped login with no way to
manage the account afterward — the name/avatar were permanently
whatever GitHub/Google returned at signup, and there was no way to
leave. `profile-menu.tsx` already had a disabled "Settings" menu item
as a placeholder for exactly this.

Confirmed with the user (via AskUserQuestion):
- **Just the display name is editable** — no separate unique
  username/handle. Nothing in the app needs a unique handle yet (no
  public profiles, no @mentions); adding one now would mean building
  uniqueness/collision handling for a feature that doesn't exist.
- **Avatar change = toggle between the provider photo and initials**,
  not a real upload. There's no image storage/upload infra in this app,
  and building one (storage, resizing, moderation) is out of proportion
  to what was asked.
- **Account deletion is a hard delete**, not soft/recoverable. The
  schema's `ON DELETE CASCADE` on `oauth_identities.user_id` and
  `sessions.user_id` already makes this a clean one-row `DELETE`.

**Scoping note**: "when registered, user should be able to change
display name" is read as *an ability, available from Settings any
time* — not a mandatory first-run onboarding wizard. No forced
"pick a name before you can continue" step.

## Design decisions worth knowing (why, not just what)

- **New `users.provider_avatar_url` column** — the app never stores
  OAuth access tokens (deliberate, per 0002), so there's no way to
  re-fetch "what was my GitHub photo" later. Without caching it at
  signup, turning the avatar toggle off and back on would permanently
  lose the original photo. `avatar_url` stays the *current effective*
  value (what `/auth/me` and `/account/profile` return);
  `provider_avatar_url` is the immutable original, set once at account
  creation, used only to restore the toggle.
- **No extra API field for toggle state** — the toggle's position is
  fully encoded by whether `avatar_url` is null (initials) or set
  (photo). The frontend derives the button label
  ("Use initials instead" / "Use my profile photo") from that alone.
- **Confirmed already true from 0002, not new**: `_get_or_create_user`
  only inserts on first signup and never touches `display_name`/
  `avatar_url` on repeat logins — verified directly (simulated a
  second login with different provider-supplied name/avatar; the
  user's customizations were untouched). A user's edits here are safe
  from being silently overwritten by a later OAuth re-login.
- **New `web/backend/account.py` module**, not more routes bolted onto
  `auth.py` — authentication vs. account management are different
  concerns, same reasoning already used to split `ratelimit.py` out in
  0002.
- **`require_user_id(request)` in `auth.py`**, exported for
  `account.py`. Raises 401 for no/invalid session — the opposite
  default from `/auth/me`, which deliberately returns `{"user": null}`
  (200) for the anonymous case. Mutating endpoints need to reject, not
  degrade.
- **No rate limiting on the new endpoints** — unlike `/feedback` or
  `/submit`, these require an already-valid session to reach at all,
  and are naturally low-frequency. Same reasoning already applied to
  `/auth/me`.
- **Hard delete cascades with zero new code**: `DELETE FROM users
  WHERE id = %s` removes `oauth_identities` and `sessions` rows
  automatically via existing FKs — verified directly (all three tables
  confirmed empty after a delete), which also means every session
  across every device is invalidated in the same statement.
- **New `ui/alert-dialog.tsx` wrapper** —
  `@base-ui/react/alert-dialog` was already a transitive dependency
  (base-ui is used throughout: `avatar`, `dropdown-menu`, `popover`),
  just not wrapped yet. Follows the same wrapper pattern already
  established for every other primitive in `components/ui/`. Used only
  for the delete-account confirmation — the one truly destructive,
  irreversible action here, worth a real two-step confirmation rather
  than a single click.
- **Avatar toggle is a plain button, not a new Switch/Checkbox
  primitive** — neither existed in `components/ui/`, and a single
  binary toggle didn't justify introducing one.
- **No dedicated onboarding flow, no forced redirect after first
  login** — Settings is reachable any time via the now-enabled
  "Settings" item in `ProfileMenu`'s dropdown.

## Schema

`db/migrations/0002_user_profile.sql`:
```sql
ALTER TABLE users ADD COLUMN provider_avatar_url TEXT;
UPDATE users SET provider_avatar_url = avatar_url WHERE provider_avatar_url IS NULL;
```

## What shipped

- `web/backend/auth.py` — `_get_or_create_user` now also sets
  `provider_avatar_url` on insert; new `require_user_id` helper.
- `web/backend/account.py` (new) — `PATCH /account/profile`
  (`display_name?`, `use_provider_avatar?`), `DELETE /account`.
- `web/backend/main.py` — includes the account router.
- `web/frontend/src/components/ui/alert-dialog.tsx` (new).
- `web/frontend/src/lib/account.ts` (new) — `updateProfile()`,
  `deleteAccount()`.
- `web/frontend/src/app/settings/page.tsx` (new).
- `web/frontend/src/components/profile-menu.tsx` — Settings link
  enabled (was a disabled placeholder).

## Verification

Full backend lifecycle verified directly against a real local Postgres
(synthetic session created via `auth._get_or_create_user`, same
technique used in 0002 to avoid needing live provider consent for
backend-only checks):
- 401 on both endpoints with no session cookie.
- Display name updates, strips whitespace, rejects empty (422).
- Avatar toggle round-trips: off → null, back on → the *original*
  `provider_avatar_url`, not lost.
- Simulated repeat login (same provider identity, different
  provider-supplied name/avatar) left the user's customizations
  untouched.
- Delete: all three tables (`users`, `oauth_identities`, `sessions`)
  confirmed empty afterward; `/auth/me` with the now-dead session
  token returns `{"user": null}`.

Full page verified in a real browser (Playwright, session cookie set
directly to skip live OAuth consent): zero page errors across the
whole flow — load, edit name, toggle avatar off/on, open the delete
confirmation dialog (without confirming, to avoid destroying the test
run's own session mid-script).

## Explicitly out of scope
- A unique username/handle.
- Real avatar upload/custom image URLs — since built, see
  [0004](./0004-avatar-upload.md).
- Soft delete / account recovery window.
- Forced onboarding/name-entry step at first signup.
- Any other settings beyond name, avatar, delete — nothing specific
  was named beyond these; easy to add more sections to this same page
  later once something concrete is asked for.
