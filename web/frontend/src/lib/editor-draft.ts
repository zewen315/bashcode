// Client-only, per-browser draft of in-progress code for a problem, so
// a reload doesn't wipe out whatever you were typing. Deliberately not
// synced to an account (unlike lib/local-progress.ts) — see
// problem-workspace.tsx for where this is read/written.
const PREFIX = "bashcode:code:";

export function getSavedCode(slug: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PREFIX + slug);
}

export function saveCode(slug: string, code: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFIX + slug, code);
}

export function clearSavedCode(slug: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PREFIX + slug);
}
