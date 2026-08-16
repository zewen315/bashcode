# 0018 — Fix tag-scroll and ad-slot bugs found after 0017 shipped

Status: **Implemented and verified locally. Not committed.**

## Context

0017 shipped, got reverted the same day after being seen live — three
concrete bugs, plus a request to actually build the cookie-consent
flow 0017 had only asked about:

1. Tools/Topics: wrapping to a second line was never what was wanted.
   The real ask was horizontal scroll with visible `<`/`>` arrows —
   0017 built vertical wrap + a down-chevron instead, a
   misreading of the original request.
2. The ad slot: an unfilled/blocked ad left permanent blank space,
   and — worse — adding the ad broke the Solution tab's own layout
   and vertical scrolling.
3. Terms/Privacy needed the advertising disclosure, and initially a
   custom cookie consent banner — later replaced with Google's own
   certified CMP once it was pointed out AdSense already provides
   exactly this (see below).

This doc covers the fix; 0017 covers everything about the feature
that's still true (the `problem_votes` schema/endpoints, why
`my_vote` is fetched client-side, etc.) — not repeated here.

## Design decisions worth knowing

- **`ProblemTags` reverted to single-line + real horizontal scroll**,
  `overflow-x-auto` with `scrollbar-hide` (native scrollbar hidden,
  since there are now dedicated visible controls instead) plus a
  `ChevronLeft`/`ChevronRight` button on each side. Both track
  `canScrollLeft`/`canScrollRight` off `scrollLeft` vs `scrollWidth -
  clientWidth` (via a `scroll` listener + `ResizeObserver`, same
  pattern 0017 used for its down-chevron) and click-scroll by a fixed
  140px step. A side with nothing to scroll toward gets `invisible`
  (space reserved, not `hidden` — avoids the row jumping width as the
  buttons pop in/out).
- **Root-caused the ad's layout breakage: unconstrained size on an
  async-injected element inside a resizable panel.** AdSense's
  `data-format="auto"` + `data-full-width-responsive="true"` unit
  measures its container and injects an iframe sized off that
  measurement — but the Solution panel lives in a resizable split
  view whose width can be 0 or stale at the moment `adsbygoogle.js`
  first reads it. `AdSlot` now (a) doesn't push at all until a
  `ResizeObserver` confirms the wrapper has a real non-zero width,
  and (b) wraps the `<ins>` in a fixed `height: 90px; overflow:
  hidden` box regardless — so whatever AdSense injects inside is
  physically clipped to that box and can never resize the
  surrounding `ScrollArea` out from under itself, filled or not.
- **Unfilled ads now collapse instead of leaving blank space.**
  AdSense sets `data-ad-status="unfilled"` on the `<ins>` once it's
  determined there's genuinely nothing to show — a `MutationObserver`
  on that one attribute flips local state to render `null` (not just
  visually hidden — actually removed) the moment that happens.
  Verified for real: on localhost (not an AdSense-approved domain),
  the real ad unit's request came back `data-ad-status="unfilled"`
  exactly as expected, and the component correctly collapsed to
  nothing — the same mechanism a genuine no-fill or an ad blocker
  would trigger in production.
- **Consent is Google's own "Privacy & messaging" CMP, not custom
  code.** A first pass built a homegrown localStorage-backed
  accept/reject banner gating the AdSense script — reasonable-looking,
  but not an actual certified CMP, and AdSense already ships exactly
  this feature natively (configured in the AdSense dashboard, not in
  this codebase): once a consent message is published there, the
  *same* `adsbygoogle.js` load already in `layout.tsx` auto-detects
  the visitor's region, shows Google's own certified dialog when
  required, and wires into Google's Consent Mode — no per-app banner
  needed. The custom banner, its localStorage/event-based state
  module, and the consent-gated script wrapper were all removed once
  this was pointed out; `layout.tsx` loads the script unconditionally
  again, `AdSlot` no longer checks any consent state itself (Google's
  own script governs whether an ad request even fires), and the
  footer's now-pointless "Cookie Settings" link (it only ever reopened
  the removed custom banner) was removed with it.
- **Privacy Policy gained a real "Advertising" section** (AdSense
  cookie disclosure, opt-out links to Google Ads Settings and
  aboutads.info) and the "Cookies" section was tightened to only
  describe the *essential* cookies that apply regardless of consent.
  Terms gained a short pointer to the same. Wording references
  Google's own consent dialog rather than a BashCode-specific one.

## What shipped
(On top of everything already listed in 0017.)
- `web/frontend/src/components/problem-tags.tsx` — rewritten per
  above.
- `web/frontend/src/components/ad-slot.tsx` — width-gated push,
  fixed-size clipped wrapper, unfilled collapse. No consent check —
  Google's own script owns that.
- `web/frontend/src/app/layout.tsx` — `adsbygoogle.js` loads
  unconditionally (`next/script`, `afterInteractive`).
- `web/frontend/src/app/privacy/page.tsx`, `.../terms/page.tsx` —
  advertising/cookie disclosure, referencing Google's consent dialog.

## Verification

Real local stack again (Postgres + bare backend/frontend, real
AdSense publisher/ad-unit ids — real ads still never fill on
localhost, but the request/response cycle is real). Full Playwright
pass:
- Tools chips: confirmed single-line (no wrap), right arrow visible
  when overflowing, clicking it scrolls and reveals the left arrow;
  screenshots before/after.
- Solution tab with the real (unfilled-on-localhost) ad: confirmed
  via `data-ad-status="unfilled"` that the collapse fired, confirmed
  zero layout difference vs. no-ad-present, confirmed no console
  errors.
- `adsbygoogle.js` confirmed present in the DOM unconditionally (no
  banner gating it); no custom banner text present anywhere.
- `/privacy` renders the updated wording referencing Google's own
  consent management platform.
- `npx tsc --noEmit` and `npx eslint` both clean.

## Explicitly out of scope
- Actually publishing a consent message in AdSense's "Privacy &
  messaging" dashboard — that's an account-side action outside this
  codebase; nothing here blocks on it, but EEA/UK/CH visitors won't
  see a real consent prompt until it's published there.
- Verifying an actual **filled** ad's rendered size in production
  (impossible to reproduce locally; the fixed-height clipped wrapper
  is the mitigation, not something that could be end-to-end tested
  before deploy).

## Deploy status
Not committed yet — matches this session's established cadence.
