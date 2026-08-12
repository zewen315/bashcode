"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Star, CheckCircle2, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStarredSlugs, getAttemptedSlugs, getSolvedSlugs } from "@/lib/local-progress";

export function Shortcuts() {
  const searchParams = useSearchParams();
  // Star and progress are independent filters (see problems-explorer.tsx),
  // so they live in separate query params rather than one shared "list".
  const activeProgress = searchParams.get("progress");
  const activeStarred = searchParams.get("starred") === "1";
  const [starredCount, setStarredCount] = useState<number | null>(null);
  const [finishedCount, setFinishedCount] = useState<number | null>(null);
  const [attemptedCount, setAttemptedCount] = useState<number | null>(null);

  useEffect(() => {
    const attempted = getAttemptedSlugs();
    const solved = getSolvedSlugs();
    setStarredCount(getStarredSlugs().size);
    setFinishedCount(solved.size);
    setAttemptedCount([...attempted].filter((slug) => !solved.has(slug)).length);
  }, []);

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
