"use client";

import { useProgress } from "@/lib/progress-context";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function MiniCalendar({ today }: { today: Date }) {
  const { activeDates, finishedLast3, finishedLast7, loaded } = useProgress();
  if (!loaded) return null;

  const year = today.getFullYear();
  const month = today.getMonth();
  const monthName = today.toLocaleString("en-US", { month: "long" });
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <p className="mb-2 text-sm font-medium">
        {monthName} {year}
      </p>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          const isToday = day === today.getDate();
          const isActive = day !== null && activeDates.has(dateKey(year, month, day));
          return (
            <span
              key={i}
              className={cn(
                "mx-auto flex size-6 items-center justify-center rounded-full",
                isToday
                  ? "bg-primary text-primary-foreground"
                  : isActive
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "text-foreground",
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
