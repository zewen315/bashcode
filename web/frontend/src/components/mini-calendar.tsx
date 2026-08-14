"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useProgress } from "@/lib/progress-context";
import { cn } from "@/lib/utils";
import { localDateKey } from "@/lib/date";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function MiniCalendar({ today }: { today: Date }) {
  const { finishedDates, finishedLast3, finishedLast7, loaded } = useProgress();
  // Viewed month is independent of "today" — navigating away from the
  // current month must not change which cell (if any) gets the "today"
  // treatment, only which month's days are laid out.
  const [viewed, setViewed] = useState({ year: today.getFullYear(), month: today.getMonth() });
  if (!loaded) return null;

  const { year, month } = viewed;
  const monthName = new Date(year, month, 1).toLocaleString("en-US", { month: "long" });
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  function goToMonth(delta: number) {
    setViewed(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">
          {monthName} {year}
        </p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
            className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label="Next month"
            className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          const isToday = isCurrentMonth && day === today.getDate();
          const isFinished = day !== null && finishedDates.has(localDateKey(new Date(year, month, day)));
          return (
            <span
              key={i}
              className={cn(
                "mx-auto flex size-6 items-center justify-center rounded-full",
                isFinished
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "text-foreground",
                // Today is a hollow ring, layered on top of the green
                // fill above when today also has a finished problem —
                // not a solid fill, so it never gets mistaken for
                // "finished" on its own.
                isToday && "ring-2 ring-inset ring-primary",
              )}
            >
              {day ?? ""}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Last 3 days: <span className="font-medium text-foreground">{finishedLast3} finished</span>
        </span>
        <span>
          Last 7 days: <span className="font-medium text-foreground">{finishedLast7} finished</span>
        </span>
      </div>
    </div>
  );
}
