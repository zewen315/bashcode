"use client";

import { Suspense, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProblemsSidebar } from "@/components/problems-sidebar";
import { Shortcuts } from "@/components/shortcuts";
import { ProblemsRightRail } from "@/components/problems-right-rail";
import { Widget } from "@/components/widget";
import { type ProblemSummary } from "@/lib/api";

// Below `lg`, the left sidebar and right rail don't have room to sit
// beside the problem list — instead of stacking all of it vertically
// (a very long scroll), they fold into this single slide-in drawer.
export function MobileMenu({
  problems,
  today,
}: {
  problems: ProblemSummary[];
  today: Date;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Menu className="size-4" />
        Menu
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-sm flex-col gap-4 overflow-y-auto bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-4" />
              </Button>
            </div>

            <Widget>
              <ProblemsSidebar />
            </Widget>
            <Widget title="Shortcuts">
              <Suspense fallback={null}>
                <Shortcuts totalCount={problems.length} />
              </Suspense>
            </Widget>
            <ProblemsRightRail problems={problems} today={today} />
          </div>
        </>
      )}
    </div>
  );
}
