"use client";

import { useEffect, useState } from "react";

// Defaults to `true` (matches) before the first client-side measurement,
// since this project's layouts are desktop-first — the alternative
// (defaulting false) would flash mobile-stacked layouts on desktop
// screens for a frame instead. Either default causes a brief flash on
// the "wrong" side of the breakpoint; there's no way to know the real
// viewport before client JS runs.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
