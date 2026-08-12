// Client-only, per-browser progress tracking. There's no account system
// yet (see README: auth is explicitly out of scope for V1), so "solved"
// and "starred" state lives in localStorage rather than the backend —
// real functionality, just scoped to one browser instead of a user.
const SOLVED_KEY = "bashcode:solved";
const STARRED_KEY = "bashcode:starred";
const ATTEMPTED_KEY = "bashcode:attempted";
const ACTIVITY_KEY = "bashcode:activity";
export const ACTIVITY_LIMIT = 15;

export type ActivityEntry = {
  slug: string;
  verdict: string;
  at: number;
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
