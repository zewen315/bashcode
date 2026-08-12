# 0006 — Shared auth state, save toasts, public id, dropdown redesign + profile stub

Status: **Implemented and verified locally. Not yet deployed.**

## Context

Feedback after using the account features built in 0002-0005:
1. Deleting an account didn't visibly sign the user out — the nav bar
   kept showing the deleted account until a manual refresh.
2. Saving a display name gave no clear confirmation it worked.
3. Should there be a random public identifier for users?
4. The profile dropdown should be richer (avatar, source, name, id →
   Profile → Settings → Logout), where Profile is a real page.

Confirmed via AskUserQuestion on #4's scope: the Profile page ships
now as a **stub** (avatar, name, provider, join date) — the
"dashboard and heat map" part is explicitly deferred to a separate
future task, since it needs solved/starred/activity data that
currently only lives in `localStorage`, not tied to the account.
Building a heat map off that now would reset per-browser/device,
undermining the point of having a real account — same reasoning
already applied when login shipped.

## Design decisions worth knowing (why, not just what)

- **#1 was a real architectural gap, not a one-line bug.** `ProfileMenu`
  (nav bar, mounted once at the layout level, persists across
  client-side navigation), `/settings`, and `/welcome` each
  independently called `getCurrentUser()` in their own `useEffect` and
  kept their own local `user` state. Deleting the account cleared the
  session cookie server-side and navigated away, but nothing told the
  *nav bar's* already-mounted `ProfileMenu` its cached `user` was now
  stale. Sign-out happened to look fine only because it's triggered
  from inside `ProfileMenu` itself. **Fixed with one shared
  `AuthProvider`** (`web/frontend/src/lib/auth-context.tsx`, React
  Context) wrapping the app in `app/layout.tsx`, fetched once, read by
  all three consumers via `useAuth()`, updated in one place by any
  mutation. Verified directly: after deleting the account, the nav
  bar's avatar immediately reverted to the signed-out icon with zero
  manual refresh (previously would have stayed stale).
- **`ProfileEditor` stays context-agnostic** — kept its existing
  `user`/`onUserChange` prop API unchanged; `/settings` and `/welcome`
  just pass the shared `setUser` as `onUserChange`.
- **Toasts use `@base-ui/react/toast`**, an already-installed
  transitive dependency (confirmed directly before building the
  wrapper, same as `alert-dialog` was in 0003) — not a new package.
  `ui/toast.tsx` follows this repo's established "thin styled wrapper
  over the base-ui primitive" convention. Covers all of
  `ProfileEditor`'s save actions (name, upload, revert, remove), not
  just the one originally reported — same underlying "no confirmation"
  problem in all four places.
- **`users.public_id`**: 8-char random hex
  (`secrets.token_hex(4)`), generated once at account creation,
  immutable after, not a secret (safe to show in the UI). Generated in
  Python at insert time with a retry loop — but the retry had to be
  structured carefully: a `UniqueViolation` mid-transaction leaves the
  whole transaction aborted in Postgres, so retrying just the INSERT
  statement in place doesn't work without an explicit rollback.
  `_get_or_create_user`'s insert branch instead retries the *whole*
  block with a fresh connection/transaction per attempt. Also checks
  `exc.diag.constraint_name` and only retries on an actual `public_id`
  collision — any other `UniqueViolation` (e.g. a near-simultaneous
  duplicate callback racing the `oauth_identities` constraint)
  propagates instead of silently retrying into a duplicate account.
  Existing rows get backfilled in the migration via Postgres's
  `substr(md5(random()::text || id::text), 1, 8)` trick — verified
  directly against a real pre-existing row.
- **"Registered source" (provider) needed no schema change** — a user
  has exactly one `oauth_identities` row today (no auto-linking, per
  0002), so it's available via a join.
- **`auth.fetch_user(user_id)` is now the one shared place** the
  `AuthUser` shape is built, used by `/auth/me` and every `account.py`
  endpoint that returns a user (replacing three near-duplicate
  `_user_dict`/`_fetch_user` implementations) — the shape can't drift
  between endpoints now.
- **`/profile` is a stub, deliberately** — avatar, display name,
  public id, "Signed in with GitHub/Google", and `created_at`
  (already in the schema, just never surfaced). No editing controls
  (that's `/settings`'s job); this is a read-only "this is you" view.
  The dashboard/heat map section is explicitly not built now.

## What shipped

- `db/migrations/0003_public_id.sql` (new).
- `web/backend/auth.py` — `public_id` generation with the
  constraint-aware retry described above; `fetch_user()` shared
  helper (`public_id`, `provider`, `created_at` added to the shape).
- `web/backend/account.py` — now calls `auth.fetch_user()` instead of
  its own duplicate user-dict builder.
- `web/frontend/src/lib/auth-context.tsx` (new) — `AuthProvider` +
  `useAuth()`.
- `web/frontend/src/components/ui/toast.tsx` (new).
- `web/frontend/src/components/profile-menu.tsx` — richer dropdown
  header (avatar, name, "Signed in with X", `#public_id`), Profile
  link added before Settings/Sign out, now reads from `useAuth()`.
- `web/frontend/src/app/settings/page.tsx`,
  `web/frontend/src/app/welcome/page.tsx` — migrated to `useAuth()`;
  Settings' delete handler now calls the shared `setUser(null)` (the
  actual fix for #1) and shows a toast.
- `web/frontend/src/app/profile/page.tsx` (new) — read-only stub.

## Verification

Done against the real local Postgres + local-uvicorn setup (synthetic
sessions via `auth._get_or_create_user`, same technique as every prior
pass in this series):

- Migration backfill: inserted a user row directly via SQL before
  restarting the backend, confirmed it got a real `public_id`
  afterward, not null.
- `public_id` uniqueness: 5 sequential `_get_or_create_user` calls
  with different identities all returned distinct `public_id`s.
- Real browser pass: dropdown shows avatar + name + "Signed in with
  GitHub" + `#public_id` + Profile/Settings/Sign out, in that order;
  `/profile` renders correctly with zero page errors; saving a display
  name on `/settings` shows a "Display name saved" toast.
- **The actual regression test for #1**: deleted the account from
  `/settings`, confirmed the nav bar's account button immediately
  showed the signed-out icon (inspected its rendered SVG directly) —
  no manual refresh needed, landed on `/problems`.

## Explicitly out of scope
- The dashboard/heat map itself, and the underlying
  `localStorage` → Postgres migration for solved/starred/activity data
  it depends on — separate future task.
- Any editing controls on `/profile`.
- Multi-provider account linking — `provider` display still assumes
  exactly one identity per account, true today per 0002.
