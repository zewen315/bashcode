# 0005 — Post-signup onboarding nudge (skippable name/photo prompt)

Status: **Implemented and verified locally. Not yet deployed.**

## Context

A brand-new OAuth signup used to land straight on `/problems` with
whatever name/photo GitHub or Google handed over —
`docs/decisions/0003-account-settings.md` deliberately chose not to
force a naming step at signup ("OAuth already gives a reasonable
default name, and V1 stays simple"). The user asked for new users to
immediately be offered the chance to set their name/photo.

Confirmed via AskUserQuestion: **skippable nudge, not mandatory** — a
one-time landing screen right after first signup with a prefilled name
and an upload option, plus an always-visible way to move on. Never
blocks access to the rest of the app.

## Design decisions worth knowing (why, not just what)

- **No new DB column to track "has this user seen onboarding"** —
  `auth._get_or_create_user` already branches on insert-vs-found
  identity, which *is* "is this a brand-new account." Changed it to
  return `(user_id, is_new)` instead of just `user_id`, so the OAuth
  callback can redirect new users to `/welcome` and everyone else
  straight to `/problems` with zero schema change. Verified directly:
  the same `(provider, provider_user_id)` called twice returns
  `is_new=True` then `is_new=False` with the same `user_id` both
  times — the welcome screen is structurally shown exactly once per
  account, nothing to reset or track.
- **A real page (`/welcome`), not a modal** — consistent with
  `/settings` and `/feedback` already being full pages for anything
  involving a form; also makes "skip" a plain navigation, no
  dialog-dismissal edge cases.
- **Extracted `ProfileEditor` (`components/profile-editor.tsx`) out of
  `/settings`** instead of duplicating the avatar-upload/revert/
  remove buttons and the display-name form on a second page. Takes
  `user` and `onUserChange` as props so `/settings` and `/welcome` each
  own their own `user` state while sharing the editing UI and its
  handlers/error state. Verified the extraction didn't change
  `/settings`'s behavior (name field, delete button, zero page errors,
  all present and working exactly as before).
- **Saves happen immediately, same as before — "Continue"/"Skip" are
  just navigation, not a save action.** Uploading a photo or clicking
  "Save" already persists via the existing `/account/avatar` and
  `/account/profile` endpoints, unchanged. Verified directly: editing
  the name on `/welcome` and clicking Continue left the new name
  persisted (checked via `/auth/me` after landing on `/problems`).
- **No new backend validation/endpoints** — `/welcome` is purely a
  frontend routing + UI change; the account endpoints it calls are
  untouched.
- **The one behavioral change to the OAuth callback**: it used to
  always redirect to `f"{PUBLIC_BASE_URL}/problems"`; now it's
  `/welcome` for new accounts, `/problems` for everyone else (existing
  users' redirect target is unchanged — verified directly, a repeat
  login for the same identity still returns `is_new=False`).

## What shipped

- `web/backend/auth.py` — `_get_or_create_user` returns
  `(user_id, is_new)`; the callback's final redirect is conditional on
  `is_new`.
- `web/frontend/src/components/profile-editor.tsx` (new) — extracted
  avatar upload/revert/remove + display-name form.
- `web/frontend/src/app/settings/page.tsx` — now renders
  `<ProfileEditor>`; unrelated "Danger zone" section untouched.
- `web/frontend/src/app/welcome/page.tsx` (new) — same auth-guard
  pattern as `/settings`, friendly one-time heading, `<ProfileEditor>`,
  "Continue" (primary button) and "Skip for now" (plain link), both
  navigating to `/problems`.

## Verification

Done against the real local Postgres + local-uvicorn setup (no live
provider consent needed for the redirect-logic checks — synthetic
`_get_or_create_user` calls, same technique as 0002-0004):

- `_get_or_create_user` called twice with the same identity: first
  call `is_new=True`, second call `is_new=False`, same `user_id` both
  times.
- Real browser pass on `/welcome` (synthetic session cookie): zero
  page errors, name field correctly prefilled from the OAuth-provided
  name, editing and saving the name worked, "Continue" navigated to
  `/problems`, and the edited name was confirmed persisted via
  `/auth/me` afterward.
- Real browser pass on `/settings` after the `ProfileEditor`
  extraction: zero page errors, name field and delete button both
  present and functioning — confirms the refactor didn't regress the
  existing page.

## Explicitly out of scope
- Any mandatory/blocking version of this — no routing guard, no
  "onboarding complete" flag anywhere.
- Anything beyond name + avatar on this screen.
- Changing what happens on existing-user logins.
