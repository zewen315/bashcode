import Link from "next/link";
import {
  ListChecks,
  CalendarDays,
  GraduationCap,
  BookOpenText,
  Bot,
  Briefcase,
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
  {
    label: "SRE Interview",
    icon: Briefcase,
    active: false,
    children: [
      { label: "Troubleshooting", icon: Wrench },
      { label: "Linux Fundamentals", icon: Cpu },
    ],
  },
];

function Row({
  label,
  Icon,
  active,
  showSoon,
  indent,
}: {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  showSoon: boolean;
  indent?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
        indent && "py-1.5 pl-8 text-[13px]",
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
      {ITEMS.map((item) => (
        <div key={item.label}>
          {item.active && item.href ? (
            <Link href={item.href}>
              <Row label={item.label} Icon={item.icon} active showSoon={false} />
            </Link>
          ) : (
            <span className="block cursor-not-allowed">
              <Row label={item.label} Icon={item.icon} active={false} showSoon />
            </span>
          )}
          {item.children && (
            <div className="mt-0.5 flex flex-col gap-0.5">
              {item.children.map((child) => (
                <span key={child.label} className="block cursor-not-allowed">
                  <Row label={child.label} Icon={child.icon} active={false} showSoon={false} indent />
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
