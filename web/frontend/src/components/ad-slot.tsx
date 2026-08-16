"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Matches the loader script in app/layout.tsx (Script tag, same
// client id) — this component only renders the per-placement <ins>
// unit; the site-wide adsbygoogle.js load happens once, there.
const AD_CLIENT = "ca-pub-9510918227818625";

// A fixed IAB "Banner" size (468×60), deliberately NOT the "auto" +
// full-width-responsive format the ad unit's dashboard snippet used
// originally. Confirmed directly (inspecting the live <ins> after
// adsbygoogle.js processed it): a responsive unit doesn't just size
// an inner iframe — it overwrites the <ins>'s own inline `style`
// attribute to whatever size it picks (280px tall here), *and* the
// wrapper around it, ignoring any height this component tried to set
// on either. No amount of `overflow-hidden` on a wrapper stops that,
// since the wrapper's own size gets rewritten too — that's what was
// actually blowing out the Solution tab's layout, not a missed CSS
// bound. A fixed-size unit has no such negotiation: it renders inside
// exactly the box declared, or not at all.
const AD_WIDTH_PX = 468;
const AD_HEIGHT_PX = 60;

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const insRef = useRef<HTMLModElement>(null);
  // Left as "pending" (blank box, no placeholder text) until AdSense
  // resolves the request — flips to "unfilled" once it reports no
  // fill, or after a timeout with no report at all (script blocked,
  // e.g. an ad blocker, never sets the attribute in the first place).
  const [status, setStatus] = useState<"pending" | "filled" | "unfilled">("pending");

  useEffect(() => {
    if (!slot || !wrapperRef.current) return;

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
        // adsbygoogle.js hasn't finished loading (or was blocked) —
        // the <ins> just stays empty inside its reserved box.
      }
    });
    observer.observe(wrapperRef.current);

    const attrObserver = new MutationObserver(() => {
      const value = insRef.current?.getAttribute("data-ad-status");
      if (value === "unfilled") setStatus("unfilled");
      else if (value === "filled") setStatus("filled");
    });
    if (insRef.current) {
      attrObserver.observe(insRef.current, { attributes: true, attributeFilter: ["data-ad-status"] });
    }
    const timeout = setTimeout(() => {
      setStatus((current) => (current === "pending" ? "unfilled" : current));
    }, 4000);

    return () => {
      observer.disconnect();
      attrObserver.disconnect();
      clearTimeout(timeout);
    };
  }, [slot]);

  if (!slot) {
    return (
      <div
        aria-label="Advertisement"
        role="complementary"
        className={cn(
          "flex h-[60px] items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground",
          className,
        )}
      >
        Advertisement
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={cn("relative overflow-hidden rounded-lg", className)}
      style={{ height: AD_HEIGHT_PX, maxWidth: AD_WIDTH_PX }}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "inline-block", width: AD_WIDTH_PX, height: AD_HEIGHT_PX }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
      />
      {status === "unfilled" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground"
        >
          Advertisement
        </div>
      )}
    </div>
  );
}
