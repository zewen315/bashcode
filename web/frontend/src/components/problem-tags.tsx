"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function updateScrollState() {
      if (!el) return;
      setCanScrollMore(el.scrollHeight - el.clientHeight - el.scrollTop > 4);
    }

    updateScrollState();
    el.addEventListener("scroll", updateScrollState);
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [tags, counts]);

  if (tags.length === 0) {
    return <p className="text-sm text-muted-foreground">No tags yet.</p>;
  }

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
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
      {canScrollMore && (
        <button
          type="button"
          aria-label="Scroll for more tags"
          onClick={() => scrollRef.current?.scrollBy({ top: 40, behavior: "smooth" })}
          className="pointer-events-auto absolute inset-x-0 bottom-0 flex h-6 items-end justify-center bg-gradient-to-t from-card to-transparent"
        >
          <ChevronDown className="size-3.5 animate-bounce text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
