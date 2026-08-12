import json
import os
import secrets
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse

import db
from ratelimit import check_rate_limit

# Single source of truth for computing OAuth redirect_uris, the
# post-login redirect target, and whether cookies get the Secure flag.
# Deliberately NOT derived from request.url.scheme: behind Caddy the
# backend always sees plain HTTP regardless of the public-facing
# scheme, so that would silently disable Secure in production.
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://localhost:3000")
COOKIE_SECURE = PUBLIC_BASE_URL.startswith("https://")

SESSION_COOKIE_NAME = "session"
SESSION_MAX_AGE_S = 60 * 60 * 24 * 30  # 30 days
STATE_MAX_AGE_S = 600  # 10 minutes — just long enough to complete a login
USER_AGENT = "BashCode-Backend/1.0"

PROVIDER_CONFIG = {
    "github": {
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        # read:user only — deliberately skipping user:email and the
        # extra /user/emails call. users.email is nullable by design,
        # so a missing email here is fine, not an error case.
        "scope": "read:user",
        "client_id": os.environ.get("GITHUB_CLIENT_ID"),
        "client_secret": os.environ.get("GITHUB_CLIENT_SECRET"),
    },
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        # OIDC userinfo endpoint, called with the access token we obtain
        # server-to-server — avoids needing to verify the id_token JWT
        # ourselves. openid scope is required for this endpoint to work.
        "userinfo_url": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
        "client_id": os.environ.get("GOOGLE_CLIENT_ID"),
        "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET"),
    },
}

router = APIRouter(prefix="/auth", tags=["auth"])


def _redirect_uri(provider: str) -> str:
    return f"{PUBLIC_BASE_URL}/api/auth/{provider}/callback"


def _state_cookie_name(provider: str) -> str:
    # Per-provider, not shared — otherwise starting a GitHub login in
    # one tab and a Google login in another overwrites the first tab's
    # state cookie and breaks its callback.
    return f"oauth_state_{provider}"


def _set_cookie(response, name: str, value: str, max_age: int) -> None:
    response.set_cookie(
        key=name,
        value=value,
        max_age=max_age,
        httponly=True,
        secure=COOKIE_SECURE,
        # Lax, not Strict: the OAuth callback is a cross-site top-level
        # GET navigation initiated by the provider. Strict would drop
        # the state cookie on that navigation and break every login.
        samesite="lax",
        path="/",
    )


def _exchange_code(provider: str, cfg: dict, code: str) -> str:
    data = {
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "code": code,
        "redirect_uri": _redirect_uri(provider),
    }
    if provider == "google":
        data["grant_type"] = "authorization_code"

    req = urllib.request.Request(
        cfg["token_url"],
        data=urllib.parse.urlencode(data).encode(),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            # GitHub hard-rejects requests with no User-Agent (403
            # "Missing User Agent") — a documented API requirement, not
            # just a bot heuristic like Resend/Cloudflare's block.
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        payload = json.loads(resp.read())
    access_token = payload.get("access_token")
    if not access_token:
        raise RuntimeError(f"{provider} token exchange returned no access_token: {payload}")
    return access_token


def _fetch_profile(provider: str, cfg: dict, access_token: str) -> dict:
    req = urllib.request.Request(
        cfg["userinfo_url"],
        headers={"Authorization": f"Bearer {access_token}", "User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = json.loads(resp.read())

    if provider == "github":
        return {
            "id": raw["id"],
            "email": raw.get("email"),
            "display_name": raw.get("name") or raw.get("login"),
            "avatar_url": raw.get("avatar_url"),
        }
    return {
        "id": raw["sub"],
        "email": raw.get("email"),
        "display_name": raw.get("name"),
        "avatar_url": raw.get("picture"),
    }


def _get_or_create_user(
    provider: str, provider_user_id: str, email: str | None, display_name: str | None, avatar_url: str | None
) -> tuple[int, bool]:
    """Returns (user_id, is_new) — is_new is exactly "this INSERT branch
    ran", which the callback uses to decide whether to route through
    the one-time /welcome nudge (see docs/decisions/0005-onboarding-nudge.md).
    """
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM oauth_identities WHERE provider = %s AND provider_user_id = %s",
                (provider, provider_user_id),
            )
            row = cur.fetchone()
            if row:
                cur.execute(
                    "UPDATE oauth_identities SET email = %s WHERE provider = %s AND provider_user_id = %s",
                    (email, provider, provider_user_id),
                )
                return row[0], False

            # No auto-linking by email across providers, by design — a
            # matching email on another provider still gets a distinct
            # account. See docs/decisions/0002-oauth-login-sessions.md.
            # provider_avatar_url is set once here and never touched
            # again — the immutable original, used to restore the
            # avatar toggle in account.py after it's been turned off.
            cur.execute(
                """
                INSERT INTO users (email, display_name, avatar_url, provider_avatar_url)
                VALUES (%s, %s, %s, %s) RETURNING id
                """,
                (email, display_name, avatar_url, avatar_url),
            )
            user_id = cur.fetchone()[0]
            cur.execute(
                "INSERT INTO oauth_identities (user_id, provider, provider_user_id, email) VALUES (%s, %s, %s, %s)",
                (user_id, provider, provider_user_id, email),
            )
            return user_id, True


@router.get("/{provider}/login")
def login(provider: str):
    cfg = PROVIDER_CONFIG.get(provider)
    if not cfg:
        raise HTTPException(status_code=404, detail="unknown provider")
    if not cfg["client_id"] or not cfg["client_secret"]:
        raise HTTPException(status_code=503, detail=f"{provider} login isn't configured yet")

    state = secrets.token_urlsafe(24)
    params = {
        "client_id": cfg["client_id"],
        "redirect_uri": _redirect_uri(provider),
        "scope": cfg["scope"],
        "state": state,
    }
    if provider == "google":
        params["response_type"] = "code"

    response = RedirectResponse(f"{cfg['authorize_url']}?{urllib.parse.urlencode(params)}", status_code=302)
    _set_cookie(response, _state_cookie_name(provider), state, STATE_MAX_AGE_S)
    return response


@router.get("/{provider}/callback")
def callback(provider: str, request: Request):
    check_rate_limit(request)
    cfg = PROVIDER_CONFIG.get(provider)
    if not cfg:
        raise HTTPException(status_code=404, detail="unknown provider")

    cookie_name = _state_cookie_name(provider)

    def redirect_home() -> RedirectResponse:
        resp = RedirectResponse(f"{PUBLIC_BASE_URL}/problems", status_code=302)
        resp.delete_cookie(cookie_name, path="/")
        return resp

    params = request.query_params
    # Provider-side denial (user clicked Cancel) or a malformed hit with
    # no code — bail out before touching the state cookie logic at all.
    if "error" in params or "code" not in params:
        return redirect_home()

    state = params.get("state")
    cookie_state = request.cookies.get(cookie_name)
    if not state or not cookie_state or state != cookie_state:
        return redirect_home()

    try:
        access_token = _exchange_code(provider, cfg, params["code"])
        profile = _fetch_profile(provider, cfg, access_token)
        user_id, is_new = _get_or_create_user(
            provider,
            str(profile["id"]),
            profile.get("email"),
            profile.get("display_name"),
            profile.get("avatar_url"),
        )
    except Exception as exc:  # noqa: BLE001 — any failure here just means "login didn't work"
        print(f"OAuth {provider} login failed: {exc}", file=sys.stderr)
        return redirect_home()

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=SESSION_MAX_AGE_S)
    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
                (token, user_id, expires_at),
            )

    # New accounts land on the one-time onboarding nudge instead of
    # straight to /problems — see docs/decisions/0005-onboarding-nudge.md.
    destination = "welcome" if is_new else "problems"
    resp = RedirectResponse(f"{PUBLIC_BASE_URL}/{destination}", status_code=302)
    resp.delete_cookie(cookie_name, path="/")
    _set_cookie(resp, SESSION_COOKIE_NAME, token, SESSION_MAX_AGE_S)
    return resp


@router.get("/me")
def me(request: Request):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return {"user": None}

    with db.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT users.id, users.display_name, users.avatar_url, users.provider_avatar_url, users.email
                FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token = %s AND sessions.expires_at > now()
                """,
                (token,),
            )
            row = cur.fetchone()

    if not row:
        return {"user": None}
    user_id, display_name, avatar_url, provider_avatar_url, email = row
    return {
        "user": {
            "id": user_id,
            "display_name": display_name,
            "avatar_url": avatar_url,
            "provider_avatar_url": provider_avatar_url,
            "email": email,
        }
    }


def require_user_id(request: Request) -> int:
    """For endpoints that mutate account state — unlike /me (which
    degrades to {"user": null} for the anonymous case), these should
    reject outright.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    user_id = None
    if token:
        with db.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT user_id FROM sessions WHERE token = %s AND expires_at > now()",
                    (token,),
                )
                row = cur.fetchone()
                user_id = row[0] if row else None
    if user_id is None:
        raise HTTPException(status_code=401, detail="not signed in")
    return user_id


@router.post("/logout")
def logout(request: Request):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        with db.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM sessions WHERE token = %s", (token,))

    response = JSONResponse({"signed_out": True})
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return response
