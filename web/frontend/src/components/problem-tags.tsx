"use client";

import { cn } from "@/lib/utils";

export function ProblemTags({
  tags,
  selected,
  onSelect,
}: {
  tags: string[];
  selected: string | null;
  onSelect: (tag: string | null) => void;
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
          onClick={() => onSelect(selected === tag ? null : tag)}
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition-colors",
            selected === tag
              ? "border-primary bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
