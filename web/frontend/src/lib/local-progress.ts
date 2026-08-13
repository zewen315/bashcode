// Client-only, per-browser progress tracking — the anonymous-mode
// implementation. Signed-in progress lives in Postgres instead (see
// lib/progress-context.tsx); this file is only ever called from
// inside ProgressProvider now, never directly from components, so
// this remains exactly what a signed-out visitor sees. On login,
// whatever's here gets uploaded and merged into the account (see
// hasLegacyData/readAllLocalProgress/clearAllLocalProgress below),
// then cleared — see docs/decisions/0008-progress-to-postgres.md.
const SOLVED_KEY = "bashcode:solved";
const STARRED_KEY = "bashcode:starred";
const ATTEMPTED_KEY = "bashcode:attempted";
const ACTIVITY_KEY = "bashcode:activity";
export const ACTIVITY_LIMIT = 15;

export type ActivityEntry = {
  slug: string;
  verdict: string;
  at: number;
  // Only ever set for signed-in (DB-backed) entries — anonymous/local
  // submissions were never written to Postgres, so there's no
  // submission id to fetch details for. Absence, not null, on purpose:
  // this type is also what gets read back out of localStorage.
  id?: number;
};

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, value: Set<string>) {
  window.localStorage.setItem(key, JSON.stringify([...value]));
}

export function getSolvedSlugs(): Set<string> {
  return readSet(SOLVED_KEY);
}

export function markSolved(slug: string) {
  const solved = readSet(SOLVED_KEY);
  solved.add(slug);
  writeSet(SOLVED_KEY, solved);
}

export function getStarredSlugs(): Set<string> {
  return readSet(STARRED_KEY);
}

export function toggleStarred(slug: string): Set<string> {
  const starred = readSet(STARRED_KEY);
  if (starred.has(slug)) {
    starred.delete(slug);
  } else {
    starred.add(slug);
  }
  writeSet(STARRED_KEY, starred);
  return starred;
}

export function recordActivity(slug: string, verdict: string, at: number) {
  if (typeof window === "undefined") return;

  const log = getRecentActivity();
  log.unshift({ slug, verdict, at });
  window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log.slice(0, ACTIVITY_LIMIT)));

  // Kept separate from the (capped) activity feed above so "problems
  // you've ever submitted" doesn't lose entries once the feed rolls over.
  const attempted = readSet(ATTEMPTED_KEY);
  attempted.add(slug);
  writeSet(ATTEMPTED_KEY, attempted);
}

export function getRecentActivity(): ActivityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY);
    return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export function getAttemptedSlugs(): Set<string> {
  return readSet(ATTEMPTED_KEY);
}

export function hasLegacyData(): boolean {
  if (typeof window === "undefined") return false;
  return [SOLVED_KEY, STARRED_KEY, ATTEMPTED_KEY, ACTIVITY_KEY].some(
    (key) => window.localStorage.getItem(key) !== null,
  );
}

// The payload shape /progress/import expects — just starred + activity.
// solved/attempted aren't sent separately: they're both derived
// server-side from activity's submissions, same as they are once a
// signed-in user's data lives in Postgres.
export function readAllLocalProgress(): { starred: string[]; activity: ActivityEntry[] } {
  return { starred: [...getStarredSlugs()], activity: getRecentActivity() };
}

// Distinct from resetCodingHistory(): this clears starred too, because
// it's called after a successful import (the data has been safely
// migrated to the account, not destroyed), not in response to the user
// asking to delete their history.
export function clearAllLocalProgress() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SOLVED_KEY);
  window.localStorage.removeItem(STARRED_KEY);
  window.localStorage.removeItem(ATTEMPTED_KEY);
  window.localStorage.removeItem(ACTIVITY_KEY);
}
