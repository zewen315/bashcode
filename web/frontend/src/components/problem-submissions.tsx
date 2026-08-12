"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { getRecentActivity, ACTIVITY_LIMIT, type ActivityEntry } from "@/lib/local-progress";
import { relativeTime } from "@/lib/relative-time";

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

// Real, not a placeholder — filters the same localStorage activity log
// the "Recent Activity" widget uses, scoped to this problem's slug. The
// log is a shared, capped-at-ACTIVITY_LIMIT feed across ALL problems
// (see local-progress.ts), so once you've solved a handful of others,
// older submissions to *this* problem can roll off — worth knowing this
// isn't a complete history, just what's still in the shared recent feed.
export function ProblemSubmissions({ slug }: { slug: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setEntries(getRecentActivity().filter((e) => e.slug === slug));
    setNow(Date.now());
  }, [slug]);

  if (now === null) return null;

  if (entries.length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-muted-foreground">
        No submissions yet for this problem — Submit a solution to see it here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-5 py-4">
      {entries.map((entry, i) => {
        const Icon = VERDICT_ICON[entry.verdict] ?? Clock;
        return (
          <div key={i} className="flex items-center gap-2 rounded border p-2 text-sm">
            <Icon className={`size-4 shrink-0 ${VERDICT_COLOR[entry.verdict] ?? "text-muted-foreground"}`} />
            {entry.verdict}
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {relativeTime(entry.at, now)}
            </span>
          </div>
        );
      })}
      <p className="mt-2 text-xs text-muted-foreground">
        Only your {ACTIVITY_LIMIT} most recent submissions across all problems are kept
        (in this browser only) — older ones may have rolled off.
      </p>
    </div>
  );
}
