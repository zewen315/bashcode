import { FlaskConical } from "lucide-react";

// Deliberately a fixed, loud color rather than a theme token — this is
// meant to stand out from the rest of the UI regardless of light/dark mode.
export function BetaBanner() {
  return (
    <div className="flex h-8 shrink-0 items-center justify-center gap-2 bg-sky-500 px-4 text-center text-xs font-medium text-white">
      <FlaskConical className="size-3.5 shrink-0" />
      BashCode is in beta — things may change, and feedback is welcome.
    </div>
  );
}
