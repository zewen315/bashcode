// Deliberately fixed colors, not theme tokens — a terminal is dark with
// phosphor-green text regardless of whether the rest of the site is in
// light or dark mode, so the mark should read the same in both.
const TERMINAL_BG = "#0b0f0d";
const TERMINAL_GREEN = "#4ade80";

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 46 32" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="46" height="32" rx="8" fill={TERMINAL_BG} />
      <text
        x="23"
        y="22"
        textAnchor="middle"
        className="font-mono"
        fill={TERMINAL_GREEN}
        fontSize="15"
        fontWeight="700"
      >
        $B_
      </text>
    </svg>
  );
}
