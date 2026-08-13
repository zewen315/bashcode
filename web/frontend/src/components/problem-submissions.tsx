"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useProgress } from "@/lib/progress-context";
import { ACTIVITY_LIMIT, type ActivityEntry } from "@/lib/local-progress";
import { relativeTime } from "@/lib/relative-time";
import { fetchSubmissionDetail, type SubmissionDetail } from "@/lib/progress-api";
import { type SubmitResult, type SubmissionResultData } from "@/lib/api";

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

function submitResultToData(result: SubmitResult): SubmissionResultData {
  const firstFailure = result.tests.find((t) => !t.passed);
  return {
    verdict: result.verdict,
    elapsed_seconds: result.elapsed_seconds,
    total_tests: result.tests.length,
    first_failure: firstFailure
      ? { name: firstFailure.name, expected: firstFailure.expected, actual: firstFailure.actual }
      : null,
  };
}

function SubmissionResult({ result }: { result: SubmissionResultData }) {
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
          All {result.total_tests} hidden tests passed.
        </p>
      ) : result.first_failure ? (
        <div className="mt-2 flex flex-col gap-1 rounded bg-muted p-2 font-mono text-xs">
          <p className="text-muted-foreground">{result.first_failure.name}</p>
          <p>Expected: {JSON.stringify(result.first_failure.expected)}</p>
          <p>Got: {JSON.stringify(result.first_failure.actual)}</p>
        </div>
      ) : null}
    </div>
  );
}

function SubmissionRow({
  entry,
  now,
  expanded,
  onToggle,
  detail,
  loading,
}: {
  entry: ActivityEntry;
  now: number;
  expanded: boolean;
  onToggle: () => void;
  detail: SubmissionDetail | null | undefined;
  loading: boolean;
}) {
  const Icon = VERDICT_ICON[entry.verdict] ?? Clock;
  const clickable = entry.id !== undefined;

  const row = (
    <div className="flex items-center gap-2 p-2 text-sm">
      <Icon className={`size-4 shrink-0 ${VERDICT_COLOR[entry.verdict] ?? "text-muted-foreground"}`} />
      {entry.verdict}
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{relativeTime(entry.at, now)}</span>
      {clickable &&
        (expanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        ))}
    </div>
  );

  return (
    <div className="rounded border">
      {clickable ? (
        <button type="button" onClick={onToggle} className="w-full text-left hover:bg-muted/50">
          {row}
        </button>
      ) : (
        row
      )}
      {clickable && expanded && (
        <div className="border-t p-2">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : !detail || !detail.details ? (
            <p className="text-xs text-muted-foreground">
              Details aren&apos;t available for this older submission.
            </p>
          ) : (
            <SubmissionResult result={{ verdict: detail.verdict, ...detail.details }} />
          )}
        </div>
      )}
    </div>
  );
}

// Real, not a placeholder — filters the shared activity feed (from
// ProgressProvider — localStorage when signed out, Postgres when
// signed in) the "Recent Activity" widget uses too, scoped to this
// problem's slug. The feed is shared and capped at ACTIVITY_LIMIT
// across ALL problems, so once you've solved a handful of others,
// older submissions to *this* problem can roll off — worth knowing
// this isn't a complete history, just what's still in the shared feed.
//
// Rows only expand when the entry has an `id` — anonymous/local
// submissions were never written to Postgres, so there's no
// submission to fetch details for; those rows stay plain, same as
// before this feature existed.
export function ProblemSubmissions({
  slug,
  liveResult,
}: {
  slug: string;
  liveResult?: SubmitResult | null;
}) {
  const { user } = useAuth();
  const { activity, loaded } = useProgress();
  // Lazy initializer, not a render-time call — Date.now() is impure
  // and can't be called directly in the render body.
  const [now] = useState(() => Date.now());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [detailsCache, setDetailsCache] = useState<Record<number, SubmissionDetail | null>>({});

  if (!loaded) return null;

  const entries = activity.filter((e) => e.slug === slug);

  function handleToggle(entry: ActivityEntry) {
    if (entry.id === undefined) return;
    const id = entry.id;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!(id in detailsCache)) {
      setLoadingId(id);
      fetchSubmissionDetail(id).then((detail) => {
        setDetailsCache((prev) => ({ ...prev, [id]: detail }));
        setLoadingId(null);
      });
    }
  }

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {liveResult && <SubmissionResult result={submitResultToData(liveResult)} />}

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Inbox className="size-6 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            No submissions yet — Submit a solution to see your results here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, i) => (
            <SubmissionRow
              key={entry.id ?? i}
              entry={entry}
              now={now}
              expanded={entry.id !== undefined && expandedId === entry.id}
              onToggle={() => handleToggle(entry)}
              detail={entry.id !== undefined ? detailsCache[entry.id] : undefined}
              loading={entry.id !== undefined && loadingId === entry.id}
            />
          ))}
          <p className="mt-1 text-xs text-muted-foreground">
            Only your {ACTIVITY_LIMIT} most recent submissions across all problems are kept
            {user ? "" : " (in this browser only)"} — older ones may have rolled off.
          </p>
        </div>
      )}
    </div>
  );
}
