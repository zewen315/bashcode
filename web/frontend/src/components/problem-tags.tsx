"use client";

import { cn } from "@/lib/utils";

export function ProblemTags({
  tags,
  counts,
  selected,
  onToggle,
}: {
  tags: string[];
  counts?: Record<string, number>;
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  if (tags.length === 0) {
    return <p className="text-sm text-muted-foreground">No tags yet.</p>;
  }

  return (
    <div className="scrollbar-hide flex gap-1.5 overflow-x-auto">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onToggle(tag)}
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition-colors",
            selected.includes(tag)
              ? "border-primary bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {tag}
          {counts?.[tag] !== undefined && (
            <span
              className={cn(
                "ml-1",
                selected.includes(tag) ? "text-primary-foreground/70" : "text-muted-foreground/70",
              )}
            >
              {counts[tag]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
