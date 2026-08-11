import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Widget({
  title,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border bg-card shadow-sm", className)}>
      {title && (
        <h2 className="border-b px-4 py-3 text-sm font-semibold">
          <span className="mr-1.5 font-mono text-primary">$</span>
          {title}
        </h2>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </div>
  );
}
