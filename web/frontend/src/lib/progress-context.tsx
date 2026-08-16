"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getSolvedSlugs,
  getStarredSlugs,
  getAttemptedSlugs,
  getRecentActivity,
  markSolved,
  toggleStarred,
  recordActivity,
  hasLegacyData,
  readAllLocalProgress,
  clearAllLocalProgress,
  ACTIVITY_LIMIT,
  type ActivityEntry,
} from "@/lib/local-progress";
import { fetchProgress, starProblem, unstarProblem, importLocalProgress } from "@/lib/progress-api";
import { localDateKey } from "@/lib/date";

const DAY_MS = 24 * 60 * 60 * 1000;

type ProgressContextValue = {
  loaded: boolean;
  solved: Set<string>;
  starred: Set<string>;
  attempted: Set<string>;
  activity: ActivityEntry[];
  finishedDates: Set<string>;
  finishedLast3: number;
  finishedLast7: number;
  toggleStar: (slug: string) => void;
  recordSubmission: (slug: string, verdict: string, at: number, id?: number) => void;
  // Lets Settings' "Reset coding history" update the in-memory cache
  // immediately after clearing server/local state, without a refetch.
  clearHistory: () => void;
};

// Derives the calendar heat map / finished-count fields from a capped
// activity list — used for signed-out mode where there's no DB to
// query directly, only the same last-15-entries local-progress.ts
// already keeps for RecentActivity. Inherits that cap's limitation.
function deriveFromActivity(activity: ActivityEntry[]) {
  const finishedDates = new Set(
    activity.filter((a) => a.verdict === "Accepted").map((a) => localDateKey(new Date(a.at))),
  );
  const now = Date.now();
  const finishedLast3 = new Set(
    activity.filter((a) => a.verdict === "Accepted" && now - a.at <= 3 * DAY_MS).map((a) => a.slug),
  ).size;
  const finishedLast7 = new Set(
    activity.filter((a) => a.verdict === "Accepted" && now - a.at <= 7 * DAY_MS).map((a) => a.slug),
  ).size;
  return { finishedDates, finishedLast3, finishedLast7 };
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

// Mirrors AuthProvider (auth-context.tsx) — one shared source of truth
// instead of every consumer independently reading local-progress.ts on
// its own mount, which is what caused sibling components on the same
// page (e.g. Shortcuts and ProblemsExplorer on /problems) to fall out
// of sync with each other until a full page reload. Also the one place
// that switches between localStorage (signed out) and Postgres (signed
// in) — see docs/decisions/0008-progress-to-postgres.md.
export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [attempted, setAttempted] = useState<Set<string>>(new Set());
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [finishedDates, setFinishedDates] = useState<Set<string>>(new Set());
  const [finishedLast3, setFinishedLast3] = useState(0);
  const [finishedLast7, setFinishedLast7] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      if (!user) {
        // Signed out: read local state as-is. Deliberately never
        // touches whatever's here based on a previous signed-in
        // session — no account data is ever written into
        // localStorage, so this is always either empty or this
        // browser's own pre-existing anonymous data, never a trace of
        // an account that just logged out.
        const localActivity = getRecentActivity();
        return {
          solved: getSolvedSlugs(),
          starred: getStarredSlugs(),
          attempted: getAttemptedSlugs(),
          activity: localActivity,
          ...deriveFromActivity(localActivity),
        };
      }
      if (hasLegacyData()) {
        await importLocalProgress(readAllLocalProgress());
        clearAllLocalProgress();
      }
      // The server buckets finished_dates by calendar day in this
      // timezone (it has no other way to know it — submitted_at is
      // stored in UTC) — without it, a submission made in the evening
      // in a negative-UTC-offset timezone gets attributed to tomorrow.
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const data = await fetchProgress(tz);
      return {
        solved: new Set(data?.solved ?? []),
        starred: new Set(data?.starred ?? []),
        attempted: new Set(data?.attempted ?? []),
        activity: data?.activity ?? [],
        finishedDates: new Set(data?.finished_dates ?? []),
        finishedLast3: data?.finished_last_3_days ?? 0,
        finishedLast7: data?.finished_last_7_days ?? 0,
      };
    }

    load().then((result) => {
      if (cancelled) return;
      setSolved(result.solved);
      setStarred(result.starred);
      setAttempted(result.attempted);
      setActivity(result.activity);
      setFinishedDates(result.finishedDates);
      setFinishedLast3(result.finishedLast3);
      setFinishedLast7(result.finishedLast7);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  function toggleStar(slug: string) {
    const isStarred = starred.has(slug);
    setStarred((prev) => {
      const next = new Set(prev);
      if (isStarred) next.delete(slug);
      else next.add(slug);
      return next;
    });
    if (!user) {
      toggleStarred(slug);
      return;
    }
    if (isStarred) unstarProblem(slug);
    else starProblem(slug);
  }

  function recordSubmission(slug: string, verdict: string, at: number, id?: number) {
    // Signed in: the server already persisted this as a side effect of
    // the /submit call that produced this verdict — this just updates
    // the local cache to match, no separate API call needed.
    // Signed out: local-progress.ts is still the actual write path.
    if (!user) {
      recordActivity(slug, verdict, at);
      if (verdict === "Accepted") markSolved(slug);
    }
    // `id` (the DB row's id, when signed in) makes this entry
    // expandable right away — see the ActivityEntry.id comment in
    // local-progress.ts for why it's otherwise absent here.
    setActivity((prev) => [{ slug, verdict, at, id }, ...prev].slice(0, ACTIVITY_LIMIT));
    setAttempted((prev) => new Set(prev).add(slug));
    if (verdict === "Accepted") {
      setSolved((prev) => new Set(prev).add(slug));
      setFinishedDates((prev) => new Set(prev).add(localDateKey(new Date(at))));
      setFinishedLast3((prev) => prev + 1);
      setFinishedLast7((prev) => prev + 1);
    }
  }

  function clearHistory() {
    setSolved(new Set());
    setAttempted(new Set());
    setActivity([]);
    setFinishedDates(new Set());
    setFinishedLast3(0);
    setFinishedLast7(0);
  }

  return (
    <ProgressContext.Provider
      value={{
        loaded,
        solved,
        starred,
        attempted,
        activity,
        finishedDates,
        finishedLast3,
        finishedLast7,
        toggleStar,
        recordSubmission,
        clearHistory,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
