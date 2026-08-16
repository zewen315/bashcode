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

This first pass at a fix (clipped wrapper + collapse-on-unfilled +
`invisible` arrow buttons) shipped, and the *same* Solution-tab
layout/scroll bug was still there in production. That triggered a
second, deeper round documented under "Round 2" below, which found
the real root cause of the ad bug and two more explicit corrections:
vote counts must always show (including zero) and a hint must show
for logged-in users too, and the tag-scroll arrows must always be
rendered (never `invisible`) rather than reserving blank space.

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
  140px step. **Round 1 made a side with nothing to scroll toward
  `invisible` (space reserved).** Seen live, this read as ugly blank
  space rather than a legible "can't scroll this way" state. **Round
  2 fix:** both buttons always render; a disabled side is a real
  `disabled` button dimmed via `disabled:opacity-30
  disabled:pointer-events-none`, not an invisible one — so the
  control is always visibly present, just visually inert when there's
  nothing to scroll toward.
- **The ad's layout breakage — round 1 diagnosis was wrong.** Round 1
  assumed the problem was an unconstrained size on an async-injected
  element inside a resizable panel, and "fixed" it with a
  width-gated push plus a fixed `height: 90px; overflow: hidden`
  wrapper around the `<ins>`. That shipped, and the same breakage was
  still there live. Round 2 root-caused it for real by isolating the
  bug directly in the DOM: with `<AdSlot>` temporarily removed from
  `ProblemSolution`, `<main>`'s height was correct (920px) on every
  tab; with it back, the Solution tab alone jumped to 2345px,
  immediately on mount. Dumping the live `<ins>` after
  `adsbygoogle.js` processed it showed why: with
  `data-ad-format="auto" data-full-width-responsive="true"`, Google's
  script does not just size an inner iframe — it **overwrites the
  `<ins>` element's own inline `style` attribute** (here, `height:
  90px` → `height: 280px`), and the wrapper's `getBoundingClientRect()`
  grew to match. `overflow: hidden` on the wrapper is powerless
  against this, because the wrapper's *own* box was the thing being
  resized, not just an overflowing child inside it. **Round 2 fix:**
  drop `data-ad-format`/`data-full-width-responsive` entirely and use
  a fixed IAB "Banner" size (468×60) on both the `<ins>` and its
  wrapper. With no "auto" negotiation to perform, Google's script
  renders inside exactly the declared box and never touches its
  style attribute. Re-verified with the same DOM-level checks:
  `<main>` stays at 920px across every tab switch, `<ins>` and
  wrapper both stay pinned at 468×60, and a real `scrollTo({top:
  500})` on the Solution tab's scroll viewport correctly lands at
  `scrollTop: 500` (round 1's fix still left it stuck at `0`).
- **Unfilled/blocked ads no longer collapse — the box stays, styled
  as a placeholder instead.** Round 1 added a `MutationObserver` on
  `data-ad-status="unfilled"` that removed the `<ins>` from the DOM
  entirely once AdSense reported no fill. Explicit instruction after
  round 1: don't hide the ad slot even when it isn't working — a
  disappearing/reappearing block was its own source of layout churn,
  and a reserved box that just stays empty is preferable to an
  element that comes and goes. That instruction turned out to be
  aimed at the collapse logic specifically, which was innocent of the
  real layout bug once the "auto"-format root cause above was fixed —
  so collapsing was safe to reconsider on its own merits. Decided
  against bringing it back anyway (a late collapse still causes its
  own visible content jump), but a permanently blank rectangle read
  as broken rather than intentional. Landed on a middle ground: same
  `MutationObserver` on `data-ad-status`, plus a 4s timeout to also
  catch the case where the attribute never appears at all (script
  blocked, e.g. an ad blocker) — but instead of unmounting anything,
  an `unfilled` status now overlays the same dashed-border
  "Advertisement" placeholder used for the no-`slot` case, absolutely
  positioned over the (empty) `<ins>` inside the same fixed 468×60
  box. Nothing is added to or removed from the DOM after mount, so
  there's no reflow either way — verified via the same DOM-level
  checks: `<main>` still 920px, wrapper still exactly 468×60, overlay
  rect exactly matches it.
- **Vote counts now always show, including zero, and the hint text
  shows for logged-in users too.** Round 1 only rendered a vote
  count when it was truthy (`{count > 0 && count}`, so `0` silently
  disappeared) and only showed "Sign in to vote on this problem." to
  signed-out visitors, leaving signed-in users with no affordance at
  all. Explicit correction: counts always render as a number, and the
  hint line always renders — "Vote on this problem." when signed in,
  "Sign in to vote on this problem." when not.
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
- `web/frontend/src/components/problem-tags.tsx` — arrows always
  rendered, dimmed via `disabled:opacity-30` instead of `invisible`.
- `web/frontend/src/components/ad-slot.tsx` — fixed IAB 468×60 size,
  no `data-ad-format`/`data-full-width-responsive`, no unfilled
  collapse. No consent check — Google's own script owns that.
- `web/frontend/src/components/problem-votes.tsx` — counts always
  render (including `0`); hint text always renders, text depends on
  signed-in state.
- `web/frontend/src/app/layout.tsx` — `adsbygoogle.js` loads
  unconditionally (`next/script`, `afterInteractive`).
- `web/frontend/src/app/privacy/page.tsx`, `.../terms/page.tsx` —
  advertising/cookie disclosure, referencing Google's consent dialog.

## Verification

Real local stack again (Postgres + bare backend/frontend, real
AdSense publisher/ad-unit ids — real ads still never fill on
localhost, but the request/response cycle is real). Round 2 pass, via
Playwright plus direct DOM inspection (not just screenshots, given
round 1's fix looked right on screen but wasn't):
- Tools/Topics chips: both arrows visible at rest (left dimmed, right
  active), no reserved blank space either side; screenshot confirmed.
- Solution tab: `<main>` height measured at exactly 920px across
  Description → Submissions → Discussion → Description → Solution tab
  switches (previously 2345px on Solution only); `<ins>` and its
  wrapper both measured at exactly 468×60 post-`adsbygoogle.js`; a
  real `scrollArea.evaluate(el => el.scrollTo({top: 500}))` on the
  Solution tab correctly produced `scrollTop === 500`.
- Vote widget: counts render as `0 0` (not blank) when unvoted for
  both a signed-out session and a signed-in one; hint text reads
  "Sign in to vote on this problem." when signed out and "Vote on
  this problem." when signed in; screenshot confirmed.
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
- Verifying an actual **filled** ad's rendered size in production —
  the fixed 468×60 size is a real IAB standard banner size Google
  fills against directly, but a filled creative can only be confirmed
  once the domain is live and AdSense-approved, not locally.

## Deploy status
Not committed yet — matches this session's established cadence.
