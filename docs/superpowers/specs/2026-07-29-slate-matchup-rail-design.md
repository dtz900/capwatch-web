# Slate matchup rail (in-page game navigator)

**Date:** 2026-07-29
**Status:** Design approved, ready for implementation plan
**Surface:** `/slate` (TailSlips web, `capwatch-web`)

## Problem

The `/slate` page renders one card per game, stacked in a single centered column. As more cappers get tracked, the page grows longer and there is no fast way to jump to a specific matchup. David wants a persistent, sticky-on-scroll list of the night's matchups where clicking a matchup snaps to that game.

## Goal

A sticky in-page navigator listing every game on the slate. Clicking an entry smooth-scrolls to that game and lands it just under the nav, readable. The active entry auto-highlights as the user scrolls (scroll-spy). It stays visible at every breakpoint and never harms the existing card layout.

## Confirmed decisions

1. **Rail content:** matchup teams plus live status (start time, LIVE with inning, or FINAL). Reflects the page's existing 60 second refresh, no separate polling.
2. **Narrow screens:** the rail stays visible but flips orientation. On wide desktop it is a vertical left rail. Below the desktop breakpoint it is a swipeable horizontal logo strip pinned under the nav. This keeps the "logos only, minimal room" intent without stealing width from the cards.
3. **Scroll-spy:** the entry for the game in view auto-highlights via a single IntersectionObserver.
4. **Rail number (pre-game):** unique sharp count per game (distinct `capper_id`), so a capper with a moneyline plus a prop counts once.

## Architecture

### Keystone: the rail is a sibling of `<main>`, never a wrapper

Each game card (`GameBlock`) contains a nested `sticky top-16` scoreboard strip, and `TopNav` is `sticky top-0`. CSS sticky breaks the moment any ancestor gains `overflow`, `transform`, `filter`, or `contain`. The safest guarantee that we never introduce such an ancestor is to never wrap the sticky subtree.

So `page.tsx` keeps `<main className="max-w-[920px] mx-auto px-4 sm:px-7 pb-24">` exactly as it is today, and the new `<SlateRail>` renders as a sibling immediately after `<TopNav />`:

```
<>
  <JsonLd ... />
  <TopNav />
  <SlateRail games={railGames} />   {/* new sibling, not a wrapper */}
  <main className="max-w-[920px] mx-auto px-4 sm:px-7 pb-24"> ... unchanged ... </main>
</>
```

A code comment on `<main>` warns future developers not to wrap `TopNav` + `SlateRail` + `main` in any container with `overflow` or `transform`, which would silently break the sticky chain.

### Two layout states, one component, CSS-only toggle

`SlateRail` renders both variants and toggles them with static Tailwind (`hidden xl:block` / `xl:hidden`). Because the switch is pure CSS, server and client markup are identical: no hydration mismatch, no layout shift.

**Desktop (>= `xl`, 1280px): fixed vertical rail in the left gutter.**
The centered content is 920px wide, so on a wide viewport there is empty gutter to its left. The rail is `fixed` and positioned into that gutter, so it eats zero width from the cards.

```
<aside className="hidden xl:block fixed top-[80px] z-20 w-[168px]"
       style={{ left: "calc(50% - 460px - 12px - 168px)" }}>
  <nav className="flex flex-col gap-1 max-h-[calc(100vh-96px)]
                  overflow-y-auto scrollbar-subtle pr-1"> ... </nav>
</aside>
```

`50% - 460px` is the left edge of the 920px column (460 = 920 / 2), minus a 12px gap, minus the rail width, so the rail sits entirely to the left of the column. `top-[80px]` parks it 16px under the 64px nav. The `overflow-y-auto` lives on the rail's own subtree, which has zero sticky descendants, so it is safe. Exact width and gap to be eyeballed at localhost between 1280px and 1440px (at 1280px the per-side gutter is 180px, so 168px rail plus 12px gap fits with 0px spare).

Each row: away logo, `PHI`, `@`, home logo, `MIA`, then a right-aligned status token (LIVE or inning, FINAL, or the unique sharp count pre-game). Active row gets a subtle fill plus a 2px left accent bar.

**Narrow (< `xl`, phones + tablet + small laptop): horizontal logo strip pinned under the nav.**
Sits above the flow at full width, so it costs the card column zero horizontal room.

```
<div className="xl:hidden sticky top-16 z-20 bg-[#0a0a0c]
                border-b border-[rgba(255,255,255,0.06)]">
  <nav className="flex gap-1.5 overflow-x-auto no-scrollbar px-3 py-2"> ... </nav>
</div>
```

Each chip is just the two team logos (size 20) plus, when live, a small pulsing dot. No abbreviations, no score, no status text, to keep it minimal. Reuses the existing `.no-scrollbar` utility. This is a second independent sticky context, a sibling of `<main>`, so it does not nest with or break the card strips.

### Scroll-spy

One IntersectionObserver in a `useEffect` inside `SlateRail`, mirroring the existing `StickyProfileStrip` / `BetSlipRail` pattern.

- **Targets:** `document.querySelectorAll('[data-slate-game]')`. Both `GameBlock` (`<section>`) and `QuietGameStrip` (`<div>`) get a `data-slate-game={game_id}` attribute, so one observer covers the whole slate.
- **rootMargin carves out both stacked bars:** top inset = 64 (nav) + card strip height + 8px pad, so a game highlights when it becomes readable, not when its top slides under the bars. Strip height is measured once from `[data-card-strip]` with a fallback of 96 (use the taller live-state height conservatively). Bottom inset `-55%` shrinks the active band to the upper part of the viewport so the last short game or quiet strip can still activate and adjacent games do not both report active.
- **Active pick:** on each callback, filter intersecting entries, sort by `boundingClientRect.top`, take the topmost. If none intersect during a fast scroll, keep the last active id (no flicker). Coalesce bursts with `requestAnimationFrame`.
- **Refresh-proof:** key the effect on `games.map(g => g.game_id).join(",")` (a stable string), not the array identity, so the 60 second refresh (new array each server render) does not tear down and rebind the observer every poll. It only rebinds when the game set actually changes.
- **Guard + init:** early-return if `typeof IntersectionObserver === "undefined"` (SSR / old browsers) so hydration never throws; the rail still works as native anchor links. `activeId` initializes to `games[0]?.game_id` so the first entry is highlighted at rest.

### Anchor offset (click to scroll)

Native hash jump backed by CSS `scroll-margin-top`, not a hand-rolled `window.scrollTo(y - offset)`. The browser resolves `scroll-margin-top` at scroll time against live layout, so it is immune to the drift the 60 second refresh and lazy-loaded logos cause between computing a pixel target and running the scroll.

Two coordinated pieces, both derived from one shared constant (`RAIL_STRIP_H = 40` in `rail.ts`) so they cannot diverge:

1. **On each landing target:** `scroll-mt-[112px] xl:scroll-mt-[96px]`. Below `xl`: 112 = 64 nav + 40 horizontal rail strip + 8 air. At `xl` and up: 96 = 64 nav + 32 air (no overhead strip; the desktop rail lives in the gutter).
2. **Companion edit on the card's own sticky strip (mandatory):** change `sticky top-16` to `sticky top-[104px] xl:top-16`. Below `xl` the card strip must pin below the 40px horizontal rail (64 + 40 = 104) or the two bars overlap and the scoreboard is unreadable on tablet and phone. At `xl` there is no overhead rail, so it pins at 64 as before.

Click handler: `e.preventDefault()`, set active immediately (instant feedback), `el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })`, then `history.replaceState(null, "", "#game-" + id)` so the back button is not polluted. Rows render as real `<a href="#game-...">` so keyboard and no-JS users still jump correctly. Reduced motion is respected via `matchMedia("(prefers-reduced-motion: reduce)")`. No global `html { scroll-behavior: smooth }` (it would affect the whole site); smoothness is scoped to the click handler.

### Responsive breakpoint choice

The boundary is Tailwind `xl` (1280px), chosen from gutter math, not aesthetics. The fixed `left: calc(50% - 460px - gap - railWidth)` only yields a positive, non-overlapping gutter once the viewport half exceeds 460 + gap + rail, roughly 1280px. At 1024px the calc goes negative and clamping just relocates the overlap onto the card column. So below `xl` the vertical rail is not viable and we use the horizontal strip. The rail is visible at every breakpoint, never hidden.

### RSC / client split and data shape

Server (unchanged rendering cost): `page.tsx`, `GameBlock`, `QuietGameStrip`, `CapperDayRanking`, header, ads, all pick data stay server-rendered. `page.tsx` computes `railGames = buildRailGames(gamesWithPicks, gamesWithoutPicks)` and passes the derived array across the boundary.

Client (new, minimal): only `SlateRail.tsx` is `"use client"`. It receives:

```ts
interface RailGame {
  game_id: number;
  away_team: string | null;
  home_team: string | null;
  game_state: GameState;
  away_score: number | null;
  home_score: number | null;
  game_time: string | null;
  inning: number | null;
  inning_half: InningHalf | null;
  sharp_count: number;   // unique capper_id per game
}
```

All primitives (no Dates, functions, or class instances), so it serializes cleanly through the RSC to client props channel. Passing derived `RailGame[]` rather than raw `SlateGame[]` keeps the client bundle small and avoids shipping every pick twice. `TeamLogo` is already a client component and composes inside the rail. All `window` / IntersectionObserver / `matchMedia` / `getBoundingClientRect` access lives in effects and handlers, never during render.

Data freshness: the RSC re-runs on the 60 second `revalidate`, producing fresh `railGames` (updated scores, status, sharp count). React reconciles the new props into the mounted client rail. No separate client fetch.

### Quiet (no-pick) games

Included in the rail, appended after the with-picks games in the exact on-page DOM order via `buildRailGames([...gamesWithPicks, ...gamesWithoutPicks])`, so scroll-spy positions and rail order line up top to bottom. `QuietGameStrip` already renders `id={game-${game_id}}`, so click-to-scroll and the observer target them with no extra plumbing. Excluding them would leave the lower part of a long slate unnavigable, defeating the goal.

Visual demotion so the rail does not imply action where there is none: quiet rows render at `opacity-60`; in the desktop labeled variant they show "quiet" in the status slot instead of a number; in the mobile strip they are the two logos at reduced opacity with no live dot (unless the quiet game itself goes live). A thin group divider (a `QUIET` label row on desktop, a hairline on mobile) separates the two groups, mirroring the page's own Quiet header.

## Aesthetic constraints (honored)

- Only off-white `#f7f3e9` (`--color-text`) for light text. No gold, no teal, no pure white on chrome.
- Strong color reserved for team logos, scores, and P&L. The active accent bar uses a fixed off-white (not a team color), because several MLB primaries are near-black on the dark rail (SD, CWS, COL, DET) and would vanish. This also honors the "strong color is for scores and P&L" rule.
- Sticky elements are flat section-header strips: no rounded corners on the pinned chrome, opaque background, no side chrome.
- `tabular-nums` for numbers, uppercase tracked labels for section headers. No AI-slop rounded-plus-neon.

## Components and file changes

| File | Change |
|------|--------|
| `src/lib/rail.ts` | CREATE. Export `RailGame` interface, `NAV_H = 64`, `RAIL_STRIP_H = 40`, and `buildRailGames(withPicks, withoutPicks)` (concatenate `[...withPicks, ...withoutPicks]`, map to `RailGame`, `sharp_count = new Set(picks.map(p => p.capper_id)).size`). Pure, server-side. |
| `src/components/slate/SlateRail.tsx` | CREATE. `"use client"`. Sole new client component. Renders the desktop fixed vertical rail and the below-xl horizontal logo strip. Owns the IntersectionObserver scroll-spy, `activeId` state, and the click-to-scroll handler. Internal `RailRow` renders logos, labels, and status token per breakpoint. |
| `src/app/slate/page.tsx` | EDIT (additive). Import `buildRailGames` and `SlateRail`. Compute `railGames`. Render `<SlateRail games={railGames} />` as a sibling after `<TopNav />` in the success branch only (not in the fetchError or empty branches). Leave `<main>` unchanged. Add the sticky-safety code comment. |
| `src/components/slate/GameBlock.tsx` | EDIT (two lines). On the outer `<section>`: add `data-slate-game={game.game_id}` and `scroll-mt-[112px] xl:scroll-mt-[96px]`. On the sticky strip div: add `data-card-strip` and change `sticky top-16` to `sticky top-[104px] xl:top-16`. |
| `src/components/slate/QuietGameStrip.tsx` | EDIT (one line). On the id'd `<div>`: add `data-slate-game={game.game_id}` and `scroll-mt-[112px] xl:scroll-mt-[96px]`. |
| `src/components/slate/TeamLogo.tsx` | No change. Reused at size 18 (desktop) / 20 (mobile), flat. |

## Edge cases to handle

- **Near-black team accent:** use a fixed off-white active bar (resolved above).
- **Tablet double-sticky overlap (640 to 1279px):** resolved by `sticky top-[104px] xl:top-16` on the card strip.
- **Card strip height varies by lifecycle** (pre has no score row, live/final adds one): measure the taller state, use fallback 96 plus 8px pad, let the `-55%` band absorb the rest.
- **Last game never activates:** the `-55%` bottom inset fixes this; verify a slate whose last one or two entries are quiet strips.
- **Anchor lands under bars if the strip is taller than assumed** (long pitcher line wraps, live 2-digit score): `scroll-margin` resolved at scroll time plus the pad absorbs it; verify a long pitcher matchup with a 2-digit score.
- **Observer rebind thrash on refresh:** key the effect on the joined id list, not array identity.
- **PipelineStaleBanner** renders above `<main>` in normal flow (not sticky). `TopNav` still pins at viewport 0, so the 64px constant survives; confirm the horizontal rail still pins with the banner present.
- **Error / empty branches:** do not render `SlateRail` when there are no games.
- **Reduced motion:** click handler passes `behavior: "auto"` for an instant, correctly offset jump.

## Resolved product questions

- **Mobile orientation:** horizontal logo strip below `xl` (approved). A forced left rail would cramp the cards.
- **Rail number:** unique sharp count (distinct `capper_id`), approved.
- **Desktop breakpoint:** `xl` (1280px). Laptops in the 1024 to 1279px range get the horizontal strip, not the vertical rail, because a vertical rail there would overlap the 920px column.
- **Quiet -> live reordering:** when a quiet game gets its first pick it jumps into the with-picks group on the next tick. This mirrors the page's own reordering and is acceptable.

## Open (minor, can confirm during implementation)

- Section-header copy: desktop rail header "ON THE BOARD", quiet divider "QUIET" (mirrors the page). Final wording is easy to tweak at localhost.
- Exact desktop rail width and gap in the 1280 to 1440px band, to be dialed in visually.
