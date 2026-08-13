"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Star, CheckCircle2, CircleDashed, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progress-context";

export function Shortcuts({ totalCount }: { totalCount: number }) {
  const searchParams = useSearchParams();
  // Star and progress are independent filters (see problems-explorer.tsx),
  // so they live in separate query params rather than one shared "list".
  const activeProgress = searchParams.get("progress");
  const activeStarred = searchParams.get("starred") === "1";
  const { loaded, solved, starred, attempted } = useProgress();

  const starredCount = loaded ? starred.size : null;
  const finishedCount = loaded ? solved.size : null;
  const attemptedCount = loaded
    ? [...attempted].filter((slug) => !solved.has(slug)).length
    : null;
  const notStartedCount = loaded ? totalCount - attempted.size : null;

  const items = [
    { href: "/problems?starred=1", label: "Starred", icon: Star, count: starredCount, active: activeStarred },
    {
      href: "/problems?progress=finished",
      label: "Finished",
      icon: CheckCircle2,
      count: finishedCount,
      active: activeProgress === "finished",
    },
    {
      href: "/problems?progress=attempted",
      label: "Attempted",
      icon: CircleDashed,
      count: attemptedCount,
      active: activeProgress === "attempted",
    },
    {
      href: "/problems?progress=not-started",
      label: "Not started",
      icon: Circle,
      count: notStartedCount,
      active: activeProgress === "not-started",
    },
  ];

  return (
    <div className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon, count, active }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
            active
              ? "bg-accent font-medium text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50",
          )}
        >
          <Icon className="size-4" />
          {label}
          <span className="ml-auto text-xs text-muted-foreground">{count ?? ""}</span>
        </Link>
      ))}
    </div>
  );
}
