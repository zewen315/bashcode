import Link from "next/link";
import {
  ListChecks,
  CalendarDays,
  GraduationCap,
  BookOpenText,
  Bot,
  Wrench,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "All Problems", href: "/problems", icon: ListChecks, active: true },
  { label: "Daily Question", icon: CalendarDays, active: false },
  { label: "Study Plan", icon: GraduationCap, active: false },
  { label: "Cheatsheet", icon: BookOpenText, active: false },
  { label: "AI Coding", icon: Bot, active: false },
  { label: "Troubleshooting", icon: Wrench, active: false },
  { label: "Linux Fundamentals", icon: Cpu, active: false },
];

function Row({
  label,
  Icon,
  active,
  showSoon,
}: {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  showSoon: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
        active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
      {showSoon && (
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          Soon
        </span>
      )}
    </span>
  );
}

export function ProblemsSidebar() {
  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map((item) =>
        item.active && item.href ? (
          <Link key={item.label} href={item.href}>
            <Row label={item.label} Icon={item.icon} active showSoon={false} />
          </Link>
        ) : (
          <span key={item.label} className="block cursor-not-allowed">
            <Row label={item.label} Icon={item.icon} active={false} showSoon />
          </span>
        ),
      )}
    </nav>
  );
}
