"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SCROLL_STEP_PX = 140;

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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function updateScrollState() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
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
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Scroll left"
        disabled={!canScrollLeft}
        onClick={() => scrollRef.current?.scrollBy({ left: -SCROLL_STEP_PX, behavior: "smooth" })}
        className={cn(
          "shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground",
          !canScrollLeft && "invisible",
        )}
      >
        <ChevronLeft className="size-4" />
      </button>
      <div ref={scrollRef} className="scrollbar-hide flex flex-1 gap-1.5 overflow-x-auto scroll-smooth">
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
      <button
        type="button"
        aria-label="Scroll right"
        disabled={!canScrollRight}
        onClick={() => scrollRef.current?.scrollBy({ left: SCROLL_STEP_PX, behavior: "smooth" })}
        className={cn(
          "shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground",
          !canScrollRight && "invisible",
        )}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
