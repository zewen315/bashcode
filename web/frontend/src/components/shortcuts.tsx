"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Star, CheckCircle2, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStarredSlugs, getAttemptedSlugs, getSolvedSlugs } from "@/lib/local-progress";

export function Shortcuts() {
  const searchParams = useSearchParams();
  const activeList = searchParams.get("list");
  const [starredCount, setStarredCount] = useState<number | null>(null);
  const [submittedCount, setSubmittedCount] = useState<number | null>(null);
  const [unfinishedCount, setUnfinishedCount] = useState<number | null>(null);

  useEffect(() => {
    const attempted = getAttemptedSlugs();
    const solved = getSolvedSlugs();
    setStarredCount(getStarredSlugs().size);
    setSubmittedCount(attempted.size);
    setUnfinishedCount([...attempted].filter((slug) => !solved.has(slug)).length);
  }, []);

  const items = [
    { key: "starred", label: "Starred", icon: Star, count: starredCount },
    { key: "submitted", label: "Submitted", icon: CheckCircle2, count: submittedCount },
    { key: "unfinished", label: "Unfinished", icon: CircleDashed, count: unfinishedCount },
  ];

  return (
    <div className="flex flex-col gap-1">
      {items.map(({ key, label, icon: Icon, count }) => (
        <Link
          key={key}
          href={`/problems?list=${key}`}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
            activeList === key
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
