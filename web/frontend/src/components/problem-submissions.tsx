"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getRecentActivity, ACTIVITY_LIMIT, type ActivityEntry } from "@/lib/local-progress";
import { relativeTime } from "@/lib/relative-time";
import { type SubmitResult } from "@/lib/api";

const VERDICT_ICON: Record<string, typeof CheckCircle2> = {
  Accepted: CheckCircle2,
  "Wrong Answer": XCircle,
  Timeout: Clock,
};

const VERDICT_COLOR: Record<string, string> = {
  Accepted: "text-emerald-500",
  "Wrong Answer": "text-rose-500",
  Timeout: "text-amber-500",
};

const VERDICT_BADGE_VARIANT: Record<string, "secondary" | "destructive"> = {
  Accepted: "secondary",
  "Wrong Answer": "destructive",
  Timeout: "destructive",
  "No Tests Found": "destructive",
};

function LiveResult({ result }: { result: SubmitResult }) {
  const firstFailure = result.tests.find((t) => !t.passed);
  return (
    <div className="rounded border p-3">
      <div className="flex items-center gap-2">
        <Badge variant={VERDICT_BADGE_VARIANT[result.verdict]} className={VERDICT_COLOR[result.verdict]}>
          {result.verdict}
        </Badge>
        <span className="text-xs text-muted-foreground">{result.elapsed_seconds.toFixed(2)}s</span>
      </div>
      {result.verdict === "Accepted" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          All {result.tests.length} hidden tests passed.
        </p>
      ) : firstFailure ? (
        <div className="mt-2 flex flex-col gap-1 rounded bg-muted p-2 font-mono text-xs">
          <p className="text-muted-foreground">{firstFailure.name}</p>
          <p>Expected: {JSON.stringify(firstFailure.expected)}</p>
          <p>Got: {JSON.stringify(firstFailure.actual)}</p>
        </div>
      ) : null}
    </div>
  );
}

// Real, not a placeholder — filters the same localStorage activity log
// the "Recent Activity" widget uses, scoped to this problem's slug. The
// log is a shared, capped-at-ACTIVITY_LIMIT feed across ALL problems
// (see local-progress.ts), so once you've solved a handful of others,
// older submissions to *this* problem can roll off — worth knowing this
// isn't a complete history, just what's still in the shared recent feed.
export function ProblemSubmissions({
  slug,
  liveResult,
}: {
  slug: string;
  liveResult?: SubmitResult | null;
}) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [now, setNow] = useState<number | null>(null);

  // Re-reads whenever liveResult changes too — ProblemWorkspace already
  // wrote the new entry to localStorage by the time this fires, but this
  // component's own state was set on mount and won't pick it up otherwise.
  useEffect(() => {
    setEntries(getRecentActivity().filter((e) => e.slug === slug));
    setNow(Date.now());
  }, [slug, liveResult]);

  if (now === null) return null;

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {liveResult && <LiveResult result={liveResult} />}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No submissions yet for this problem — Submit a solution to see it here.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, i) => {
            const Icon = VERDICT_ICON[entry.verdict] ?? Clock;
            return (
              <div key={i} className="flex items-center gap-2 rounded border p-2 text-sm">
                <Icon
                  className={`size-4 shrink-0 ${VERDICT_COLOR[entry.verdict] ?? "text-muted-foreground"}`}
                />
                {entry.verdict}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {relativeTime(entry.at, now)}
                </span>
              </div>
            );
          })}
          <p className="mt-1 text-xs text-muted-foreground">
            Only your {ACTIVITY_LIMIT} most recent submissions across all problems are kept
            (in this browser only) — older ones may have rolled off.
          </p>
        </div>
      )}
    </div>
  );
}
