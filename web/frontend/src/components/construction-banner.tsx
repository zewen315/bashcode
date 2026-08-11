import { Construction } from "lucide-react";

// Deliberately a fixed, loud color rather than a theme token — this is
// meant to stand out from the rest of the UI regardless of light/dark mode.
export function ConstructionBanner() {
  return (
    <div className="flex h-8 shrink-0 items-center justify-center gap-2 bg-amber-400 px-4 text-center text-xs font-medium text-amber-950">
      <Construction className="size-3.5 shrink-0" />
      BashCode is under construction — things may change or break. Feedback welcome.
    </div>
  );
}
