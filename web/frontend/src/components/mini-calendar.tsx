const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function MiniCalendar({ today }: { today: Date }) {
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
        {cells.map((day, i) => (
          <span
            key={i}
            className={
              day === today.getDate()
                ? "mx-auto flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                : "mx-auto flex size-6 items-center justify-center text-foreground"
            }
          >
            {day ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
}
