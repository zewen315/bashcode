"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react";
import { type ProblemSummary } from "@/lib/api";
import { useProgress } from "@/lib/progress-context";
import { relativeTime } from "@/lib/relative-time";

const WIDGET_LIMIT = 3;

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

export function RecentActivity({ problems }: { problems: ProblemSummary[] }) {
  const { activity, loaded } = useProgress();
  // Lazy initializer, not a render-time call — Date.now() is impure
  // and can't be called directly in the render body.
  const [now] = useState(() => Date.now());

  const titleFor = (slug: string) => problems.find((p) => p.slug === slug)?.title ?? slug;

  if (!loaded) return null;

  if (activity.length === 0) {
    return <p className="text-sm text-muted-foreground">No submissions yet — Submit a solution to see it here.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {activity.slice(0, WIDGET_LIMIT).map((entry, i) => {
        const Icon = VERDICT_ICON[entry.verdict] ?? Clock;
        return (
          <div key={i} className="flex items-center gap-2 text-sm">
            <Icon className={`size-3.5 shrink-0 ${VERDICT_COLOR[entry.verdict] ?? "text-muted-foreground"}`} />
            <span className="truncate">{titleFor(entry.slug)}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {relativeTime(entry.at, now)}
            </span>
          </div>
        );
      })}
      {activity.length > WIDGET_LIMIT && (
        <Link
          href="/activity"
          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          More <ChevronRight className="size-3" />
        </Link>
      )}
    </div>
  );
}
