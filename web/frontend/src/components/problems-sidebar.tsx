import Link from "next/link";
import { ListChecks, CalendarDays, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "All Problems", href: "/problems", icon: ListChecks, active: true },
  { label: "Daily Question", icon: CalendarDays, active: false },
  { label: "Study Plan", icon: GraduationCap, active: false },
];

export function ProblemsSidebar() {
  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const content = (
          <span
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
              item.active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
            {!item.active && (
              <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Soon
              </span>
            )}
          </span>
        );
        return item.active && item.href ? (
          <Link key={item.label} href={item.href}>
            {content}
          </Link>
        ) : (
          <span key={item.label} className="cursor-not-allowed">
            {content}
          </span>
        );
      })}
    </nav>
  );
}
