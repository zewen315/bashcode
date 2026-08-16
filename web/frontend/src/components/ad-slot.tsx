"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Matches the loader script in app/layout.tsx (Script tag, same
// client id) — this component only renders the per-placement <ins>
// unit; the site-wide adsbygoogle.js load happens once, there.
const AD_CLIENT = "ca-pub-9510918227818625";

// Bounds the space AdSense's async-injected content (usually an
// iframe) is ever allowed to occupy. Without this, a "full-width-
// responsive" unit sizing itself against a resizable split-pane panel
// (whose width can be 0 or stale at the moment adsbygoogle.js first
// measures it) has resized this panel's ScrollArea out from under
// itself after the fact — the actual cause of the broken Solution-tab
// layout/scroll reported after the ad was first added, not something
// specific to this one ad unit.
const AD_HEIGHT_PX = 90;

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
//
// Consent (whether an ad is allowed to show at all) is Google's own
// concern via "Privacy & messaging" in the AdSense dashboard — a
// certified CMP that governs the shared adsbygoogle.js load in
// layout.tsx — not something this component gates on its own.
export function AdSlot({ slot, className }: { slot?: string; className?: string }) {
  const insRef = useRef<HTMLModElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [unfilled, setUnfilled] = useState(false);

  useEffect(() => {
    if (!slot || !insRef.current || !wrapperRef.current) return;
    const ins = insRef.current;

    // Don't push until the wrapper actually has a measurable width —
    // pushing while a resizable panel is still at its initial/zero
    // width is exactly what produced a wrongly-sized ad before. Fires
    // once, on the first non-zero width.
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width <= 0) return;
      observer.disconnect();
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // adsbygoogle.js hasn't finished loading (or was blocked) — the
        // "unfilled" watcher below still applies if it never recovers.
      }
    });
    observer.observe(wrapperRef.current);

    // AdSense marks the <ins> data-ad-status="unfilled" once it's
    // determined there's genuinely no ad to show (no fill, blocked,
    // consent declined, etc.) — that's the signal used to collapse
    // the slot instead of leaving permanent blank space when nothing
    // renders.
    const statusObserver = new MutationObserver(() => {
      if (ins.getAttribute("data-ad-status") === "unfilled") setUnfilled(true);
    });
    statusObserver.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });

    return () => {
      observer.disconnect();
      statusObserver.disconnect();
    };
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

  if (unfilled) return null;

  return (
    <div
      ref={wrapperRef}
      className={cn("overflow-hidden rounded-lg", className)}
      style={{ height: AD_HEIGHT_PX }}
    >
      <ins
        ref={insRef}
        className="adsbygoogle block"
        style={{ display: "block", width: "100%", height: AD_HEIGHT_PX }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
