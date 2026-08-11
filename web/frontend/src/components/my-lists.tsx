"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Star, CheckCircle2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStarredSlugs, getAttemptedSlugs } from "@/lib/local-progress";

export function MyLists() {
  const searchParams = useSearchParams();
  const activeList = searchParams.get("list");
  const [starredCount, setStarredCount] = useState<number | null>(null);
  const [submittedCount, setSubmittedCount] = useState<number | null>(null);

  useEffect(() => {
    setStarredCount(getStarredSlugs().size);
    setSubmittedCount(getAttemptedSlugs().size);
  }, []);

  const items = [
    { key: "starred", label: "Starred", icon: Star, count: starredCount },
    { key: "submitted", label: "Submitted", icon: CheckCircle2, count: submittedCount },
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

      <div className="mt-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground/60">
        <Plus className="size-4" />
        Create a list
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          Soon
        </span>
      </div>
    </div>
  );
}
