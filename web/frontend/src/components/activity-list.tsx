"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { type ProblemSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useProgress } from "@/lib/progress-context";
import { ACTIVITY_LIMIT } from "@/lib/local-progress";
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

export function ActivityList({ problems }: { problems: ProblemSummary[] }) {
  const { user } = useAuth();
  const { activity, loaded } = useProgress();
  // Lazy initializer, not a render-time call — Date.now() is impure
  // and can't be called directly in the render body.
  const [now] = useState(() => Date.now());

  const titleFor = (slug: string) => problems.find((p) => p.slug === slug)?.title ?? slug;
  const slugFor = (slug: string) => (problems.some((p) => p.slug === slug) ? `/problems/${slug}` : null);

  if (!loaded) return null;

  if (activity.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No submissions yet — Submit a solution to see it here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {activity.map((entry, i) => {
        const Icon = VERDICT_ICON[entry.verdict] ?? Clock;
        const href = slugFor(entry.slug);
        return (
          <div key={i} className="flex items-center gap-3 rounded-md px-2 py-2.5 text-sm">
            <Icon className={`size-4 shrink-0 ${VERDICT_COLOR[entry.verdict] ?? "text-muted-foreground"}`} />
            {href ? (
              <Link href={href} className="truncate hover:text-primary">
                {titleFor(entry.slug)}
              </Link>
            ) : (
              <span className="truncate">{titleFor(entry.slug)}</span>
            )}
            <span
              className={`shrink-0 text-xs ${VERDICT_COLOR[entry.verdict] ?? "text-muted-foreground"}`}
            >
              {entry.verdict}
            </span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {relativeTime(entry.at, now)}
            </span>
          </div>
        );
      })}
      <p className="mt-2 text-xs text-muted-foreground">
        Only your {ACTIVITY_LIMIT} most recent submissions across all problems are kept
        {user ? "" : " (in this browser only)"} — older ones may have rolled off.
      </p>
    </div>
  );
}
