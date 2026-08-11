export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 32" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="32" rx="8" className="fill-primary" />
      <text
        x="20"
        y="22.5"
        textAnchor="middle"
        className="fill-primary-foreground font-sans"
        fontSize="17"
        fontWeight="800"
        letterSpacing="-0.5"
      >
        $B
      </text>
    </svg>
  );
}
