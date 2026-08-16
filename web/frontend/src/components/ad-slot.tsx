"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

// Matches the loader script in app/layout.tsx (Script tag, same
// client id) — this component only renders the per-placement <ins>
// unit; the site-wide adsbygoogle.js load happens once, there.
const AD_CLIENT = "ca-pub-9510918227818625";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

// `slot` is a specific ad unit's ID from the AdSense dashboard (Ads →
// By ad unit → Display ads) — without one, there's nothing to push,
// so this falls back to the same dashed placeholder as before rather
// than rendering a dead <ins> that never fills. Real ads also only
// ever serve on AdSense's approved production domain, never
// localhost, so pass a slot in production once one exists.
export function AdSlot({ slot, className }: { slot?: string; className?: string }) {
  useEffect(() => {
    if (!slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle.js hasn't finished loading yet (or was blocked) —
      // nothing to do; the <ins> just stays empty until/unless a
      // retry happens on next mount.
    }
  }, [slot]);

  if (!slot) {
    return (
      <div
        aria-label="Advertisement"
        role="complementary"
        className={cn(
          "flex h-[90px] items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground",
          className,
        )}
      >
        Advertisement
      </div>
    );
  }

  return (
    <ins
      className={cn("adsbygoogle block", className)}
      style={{ display: "block" }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
