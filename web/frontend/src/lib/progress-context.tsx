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

type ProgressContextValue = {
  loaded: boolean;
  solved: Set<string>;
  starred: Set<string>;
  attempted: Set<string>;
  activity: ActivityEntry[];
  toggleStar: (slug: string) => void;
  recordSubmission: (slug: string, verdict: string, at: number) => void;
  // Lets Settings' "Reset coding history" update the in-memory cache
  // immediately after clearing server/local state, without a refetch.
  clearHistory: () => void;
};

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
        return {
          solved: getSolvedSlugs(),
          starred: getStarredSlugs(),
          attempted: getAttemptedSlugs(),
          activity: getRecentActivity(),
        };
      }
      if (hasLegacyData()) {
        await importLocalProgress(readAllLocalProgress());
        clearAllLocalProgress();
      }
      const data = await fetchProgress();
      return {
        solved: new Set(data?.solved ?? []),
        starred: new Set(data?.starred ?? []),
        attempted: new Set(data?.attempted ?? []),
        activity: data?.activity ?? [],
      };
    }

    load().then((result) => {
      if (cancelled) return;
      setSolved(result.solved);
      setStarred(result.starred);
      setAttempted(result.attempted);
      setActivity(result.activity);
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

  function recordSubmission(slug: string, verdict: string, at: number) {
    // Signed in: the server already persisted this as a side effect of
    // the /submit call that produced this verdict — this just updates
    // the local cache to match, no separate API call needed.
    // Signed out: local-progress.ts is still the actual write path.
    if (!user) {
      recordActivity(slug, verdict, at);
      if (verdict === "Accepted") markSolved(slug);
    }
    setActivity((prev) => [{ slug, verdict, at }, ...prev].slice(0, ACTIVITY_LIMIT));
    setAttempted((prev) => new Set(prev).add(slug));
    if (verdict === "Accepted") {
      setSolved((prev) => new Set(prev).add(slug));
    }
  }

  function clearHistory() {
    setSolved(new Set());
    setAttempted(new Set());
    setActivity([]);
  }

  return (
    <ProgressContext.Provider
      value={{ loaded, solved, starred, attempted, activity, toggleStar, recordSubmission, clearHistory }}
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
