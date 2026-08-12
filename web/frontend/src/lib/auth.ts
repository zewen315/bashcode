// Deliberately relative paths, not API_URL — same-origin is required
// for the session cookie to be sent (fetch's default credentials mode
// is "same-origin"). Works in prod because Caddy already proxies /api/*
// on the same domain, and in local dev via next.config.ts's rewrite.
// See docs/decisions/0002-oauth-login-sessions.md.
export const GITHUB_LOGIN_URL = "/api/auth/github/login";
export const GOOGLE_LOGIN_URL = "/api/auth/google/login";

export type AuthUser = {
  id: number;
  display_name: string | null;
  avatar_url: string | null;
  provider_avatar_url: string | null;
  email: string | null;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  const body = (await res.json()) as { user: AuthUser | null };
  return body.user;
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean);
  return parts.join("").slice(0, 2).toUpperCase() || "?";
}
