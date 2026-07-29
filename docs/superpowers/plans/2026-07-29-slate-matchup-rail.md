# Slate Matchup Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sticky in-page navigator to `/slate` that lists every matchup, highlights the game in view as you scroll, and snaps to a game when its entry is clicked.

**Architecture:** A single new client component `SlateRail` renders as a sibling of `<main>` (never a wrapper, so the nav and card sticky layers keep working). It shows a fixed vertical rail in the left gutter at `xl` and up, and a horizontal logo strip pinned under the nav below `xl`. A pure server helper `buildRailGames` maps the already-fetched games to a small serializable array. Scroll-spy is one IntersectionObserver; click-to-scroll uses native hash jump backed by CSS `scroll-margin-top`.

**Tech Stack:** Next.js App Router (RSC + client components), TypeScript, Tailwind CSS, Vitest + jsdom + Testing Library. The `/slate` page (`src/app/slate/page.tsx`) is an async React Server Component.

## Global Constraints

- No em dashes and no double hyphens in any copy, comment, or label. Use periods, commas, colons, or parentheses. (CSS custom property tokens like `--color-text` are literal code and are exempt.)
- Only off-white `#f7f3e9` (`--color-text`) for light text on chrome. No gold, no teal, no pure white. Strong color is reserved for team logos, scores, and P&L. The active accent bar is fixed off-white `#f7f3e9`, not a team color (several MLB primaries are near-black and would vanish).
- Sticky chrome is flat: no rounded corners on pinned elements, opaque background, no side chrome. `tabular-nums` for numbers, uppercase tracked labels for section headers.
- Shared offset constants: `NAV_H = 64`, `RAIL_STRIP_H = 40`. Anchor targets use `scroll-mt-[112px] xl:scroll-mt-[96px]` (112 = 64 + 40 + 8; 96 = 64 + 32). The card sticky strip uses `sticky top-[104px] xl:top-16` (104 = 64 + 40).
- Responsive boundary is Tailwind `xl` (1280px): vertical rail at and above, horizontal strip below.
- Do NOT wrap `TopNav` + `SlateRail` + `main` in any container that has `overflow` or `transform`. It would break the sticky chain.
- Existing anchor ids `id={game-${game_id}}` already exist on both `GameBlock` sections and `QuietGameStrip` rows. Reuse them; do not rename.
- Test convention in this repo: unit-test pure functions in `src/lib/*.test.ts` (Vitest). React components are verified by typecheck, lint, build, and localhost, not jsdom tests.

---

### Task 1: Rail data module (`rail.ts`)

**Files:**
- Create: `src/lib/rail.ts`
- Test: `src/lib/rail.test.ts`

**Interfaces:**
- Consumes: `SlateGame`, `GameState`, `InningHalf` from `@/lib/types` (`SlateGame.picks[].capper_id` is `number`; `game_state` is `GameState`).
- Produces:
  - `const NAV_H = 64`, `const RAIL_STRIP_H = 40`
  - `interface RailGame { game_id: number; away_team: string | null; home_team: string | null; game_state: GameState; away_score: number | null; home_score: number | null; game_time: string | null; inning: number | null; inning_half: InningHalf | null; sharp_count: number; }`
  - `function railLifecycle(state: GameState | null | undefined): "pre" | "live" | "final"`
  - `function buildRailGames(withPicks: SlateGame[], withoutPicks: SlateGame[]): RailGame[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/rail.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildRailGames, railLifecycle, type RailGame } from "@/lib/rail";
import type { SlateGame, SlatePick } from "@/lib/types";

function pick(capper_id: number): SlatePick {
  // Only capper_id is read by buildRailGames; cast the rest.
  return { capper_id } as SlatePick;
}

function game(over: Partial<SlateGame> & { game_id: number }): SlateGame {
  return {
    game_id: over.game_id,
    away_team: over.away_team ?? "AWY",
    home_team: over.home_team ?? "HOM",
    away_starter: null,
    home_starter: null,
    game_date: null,
    game_time: over.game_time ?? null,
    game_state: over.game_state ?? "scheduled",
    away_score: over.away_score ?? null,
    home_score: over.home_score ?? null,
    inning: over.inning ?? null,
    inning_half: over.inning_half ?? null,
    outs: null,
    picks: over.picks ?? [],
  };
}

describe("railLifecycle", () => {
  it("maps scheduled and null to pre", () => {
    expect(railLifecycle("scheduled")).toBe("pre");
    expect(railLifecycle(null)).toBe("pre");
    expect(railLifecycle(undefined)).toBe("pre");
  });
  it("maps in_progress to live and final to final", () => {
    expect(railLifecycle("in_progress")).toBe("live");
    expect(railLifecycle("final")).toBe("final");
  });
});

describe("buildRailGames", () => {
  it("orders with-picks games before quiet games", () => {
    const withPicks = [game({ game_id: 1, picks: [pick(10)] })];
    const quiet = [game({ game_id: 2 })];
    const rail = buildRailGames(withPicks, quiet);
    expect(rail.map((r: RailGame) => r.game_id)).toEqual([1, 2]);
  });
  it("counts unique cappers, deduping a capper with multiple picks", () => {
    const withPicks = [game({ game_id: 1, picks: [pick(10), pick(10), pick(20)] })];
    const rail = buildRailGames(withPicks, []);
    expect(rail[0].sharp_count).toBe(2);
  });
  it("reports sharp_count 0 for quiet games", () => {
    const rail = buildRailGames([], [game({ game_id: 5 })]);
    expect(rail[0].sharp_count).toBe(0);
  });
  it("copies only serializable primitives", () => {
    const rail = buildRailGames(
      [game({ game_id: 1, away_team: "PHI", home_team: "MIA", picks: [pick(1)] })],
      [],
    );
    expect(rail[0]).toEqual({
      game_id: 1,
      away_team: "PHI",
      home_team: "MIA",
      game_state: "scheduled",
      away_score: null,
      home_score: null,
      game_time: null,
      inning: null,
      inning_half: null,
      sharp_count: 1,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /d/capwatch-web && npx vitest run src/lib/rail.test.ts`
Expected: FAIL (cannot resolve `@/lib/rail`).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/rail.ts`:

```ts
import type { SlateGame, GameState, InningHalf } from "@/lib/types";

/** Height of the sticky TopNav in px. */
export const NAV_H = 64;
/** Height of the below-xl horizontal rail strip in px. */
export const RAIL_STRIP_H = 40;

/** Serializable per-game descriptor passed from the RSC to the client rail. */
export interface RailGame {
  game_id: number;
  away_team: string | null;
  home_team: string | null;
  game_state: GameState;
  away_score: number | null;
  home_score: number | null;
  game_time: string | null;
  inning: number | null;
  inning_half: InningHalf | null;
  sharp_count: number;
}

/**
 * Collapse game_state into the three states the rail cares about. Mirrors
 * GameBlock.deriveLifecycle, including the defensive null guard for stale
 * ISR responses that predate the game_state field.
 */
export function railLifecycle(
  state: GameState | null | undefined,
): "pre" | "live" | "final" {
  if (!state || state === "scheduled") return "pre";
  if (state === "in_progress") return "live";
  return "final";
}

/**
 * Map fetched games to the rail payload, with-picks first then quiet, matching
 * the on-page DOM order so scroll-spy positions line up. sharp_count is the
 * number of distinct cappers on the game (a capper with multiple picks counts
 * once). Only primitives cross the RSC to client boundary.
 */
export function buildRailGames(
  withPicks: SlateGame[],
  withoutPicks: SlateGame[],
): RailGame[] {
  return [...withPicks, ...withoutPicks].map((g) => ({
    game_id: g.game_id,
    away_team: g.away_team,
    home_team: g.home_team,
    game_state: g.game_state,
    away_score: g.away_score,
    home_score: g.home_score,
    game_time: g.game_time,
    inning: g.inning,
    inning_half: g.inning_half,
    sharp_count: new Set(g.picks.map((p) => p.capper_id)).size,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /d/capwatch-web && npx vitest run src/lib/rail.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
cd /d/capwatch-web && git add src/lib/rail.ts src/lib/rail.test.ts && git commit -m "feat(slate): rail data module (buildRailGames, railLifecycle)"
```

---

### Task 2: SlateRail client component

**Files:**
- Create: `src/components/slate/SlateRail.tsx`

**Interfaces:**
- Consumes: `NAV_H`, `RAIL_STRIP_H`, `railLifecycle`, `RailGame` from `@/lib/rail`; `TeamLogo` from `./TeamLogo` (props: `abbr: string | null`, `size?: number`, `flat?: boolean`, `className?: string`).
- Produces: `export function SlateRail({ games }: { games: RailGame[] })`.

- [ ] **Step 1: Create the component**

Create `src/components/slate/SlateRail.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { TeamLogo } from "./TeamLogo";
import { NAV_H, railLifecycle, type RailGame } from "@/lib/rail";

function statusLabel(g: RailGame): string {
  const life = railLifecycle(g.game_state);
  if (life === "live") {
    return g.inning_half && g.inning != null
      ? `${g.inning_half.toUpperCase()} ${g.inning}`
      : "LIVE";
  }
  if (life === "final") return "FINAL";
  return g.sharp_count > 0 ? String(g.sharp_count) : "quiet";
}

export function SlateRail({ games }: { games: RailGame[] }) {
  const [activeId, setActiveId] = useState<number | null>(
    games[0]?.game_id ?? null,
  );
  const idsKey = games.map((g) => g.game_id).join(",");
  const firstQuietId = games.find((g) => g.sharp_count === 0)?.game_id ?? null;

  // Scroll-spy: one observer over the real rendered sections. rootMargin
  // carves out the 64px nav plus the card's own sticky strip so a game
  // highlights when it becomes readable, not when its top slips under the bars.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const stripH =
      document.querySelector("[data-card-strip]")?.getBoundingClientRect()
        .height ?? 96;
    const topInset = NAV_H + Math.round(stripH) + 8;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!vis.length) return; // keep last active, avoid flicker
        const id = Number((vis[0].target as HTMLElement).dataset.slateGame);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() =>
          setActiveId((cur) => (cur === id ? cur : id)),
        );
      },
      { rootMargin: `-${topInset}px 0px -55% 0px`, threshold: 0 },
    );
    document
      .querySelectorAll<HTMLElement>("[data-slate-game]")
      .forEach((el) => io.observe(el));
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
    // idsKey is a stable string of the game set; only rebind when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  function jump(id: number) {
    return (e: MouseEvent) => {
      e.preventDefault();
      setActiveId(id);
      const el = document.getElementById(`game-${id}`);
      if (!el) return;
      const reduce = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", `#game-${id}`);
    };
  }

  if (games.length === 0) return null;

  return (
    <>
      {/* DESKTOP (>= xl): fixed vertical rail in the left gutter. Eats 0 column width. */}
      <aside
        aria-label="Jump to game"
        className="hidden xl:block fixed top-[80px] z-20 w-[168px]"
        style={{ left: "calc(50% - 460px - 12px - 168px)" }}
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold px-2 pb-2">
          On the board
        </div>
        <nav className="flex flex-col gap-0.5 max-h-[calc(100vh-96px)] overflow-y-auto scrollbar-subtle pr-1">
          {games.map((g) => {
            const on = g.game_id === activeId;
            const quiet = g.sharp_count === 0;
            const live = railLifecycle(g.game_state) === "live";
            return (
              <div key={g.game_id}>
                {g.game_id === firstQuietId && (
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold px-2 pt-3 pb-1">
                    Quiet
                  </div>
                )}
                <a
                  href={`#game-${g.game_id}`}
                  onClick={jump(g.game_id)}
                  aria-current={on ? "true" : undefined}
                  className={`relative flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[12px] transition-colors ${
                    quiet ? "opacity-60" : ""
                  } ${
                    on
                      ? "bg-[rgba(255,255,255,0.05)] text-[var(--color-text)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-soft)]"
                  }`}
                >
                  {on && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-[#f7f3e9]"
                    />
                  )}
                  <TeamLogo abbr={g.away_team} size={18} flat />
                  <span className="font-bold tabular-nums">{g.away_team}</span>
                  <span className="opacity-40">@</span>
                  <TeamLogo abbr={g.home_team} size={18} flat />
                  <span className="font-bold tabular-nums">{g.home_team}</span>
                  <span
                    className={`ml-auto flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] tabular-nums whitespace-nowrap ${
                      live ? "text-[var(--color-pos)]" : ""
                    }`}
                  >
                    {live && (
                      <span
                        aria-hidden
                        className="w-1.5 h-1.5 rounded-full bg-[var(--color-pos)] animate-pulse"
                      />
                    )}
                    {statusLabel(g)}
                  </span>
                </a>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* NARROW (< xl): horizontal logo strip pinned under the nav. Sibling of
          main, own sticky context, eats 0 horizontal column width. */}
      <div className="xl:hidden sticky top-16 z-20 bg-[#0a0a0c] border-b border-[rgba(255,255,255,0.06)]">
        <nav
          aria-label="Jump to game"
          className="flex gap-1.5 overflow-x-auto no-scrollbar px-3 py-2"
        >
          {games.map((g) => {
            const on = g.game_id === activeId;
            const quiet = g.sharp_count === 0;
            const live = railLifecycle(g.game_state) === "live";
            return (
              <a
                key={g.game_id}
                href={`#game-${g.game_id}`}
                onClick={jump(g.game_id)}
                aria-current={on ? "true" : undefined}
                className={`relative flex items-center gap-0.5 shrink-0 px-1.5 py-1 rounded-md ${
                  quiet ? "opacity-60" : ""
                } ${
                  on
                    ? "bg-[rgba(255,255,255,0.05)] ring-1 ring-inset ring-[rgba(255,255,255,0.14)]"
                    : ""
                }`}
              >
                <TeamLogo abbr={g.away_team} size={20} flat />
                <TeamLogo abbr={g.home_team} size={20} flat />
                {live && (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--color-pos)] animate-pulse"
                  />
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Typecheck and lint the new file**

Run: `cd /d/capwatch-web && npx tsc --noEmit && npx eslint src/components/slate/SlateRail.tsx`
Expected: no type errors, no lint errors. (The component is not wired in yet, so there is nothing visual to see. It compiles standalone.)

- [ ] **Step 3: Commit**

```bash
cd /d/capwatch-web && git add src/components/slate/SlateRail.tsx && git commit -m "feat(slate): SlateRail client component (vertical rail + horizontal strip, scroll-spy)"
```

---

### Task 3: Wire SlateRail into the slate page

**Files:**
- Modify: `src/app/slate/page.tsx`

**Interfaces:**
- Consumes: `buildRailGames` from `@/lib/rail`, `SlateRail` from `@/components/slate/SlateRail`. Uses existing `gamesWithPicks` and `gamesWithoutPicks` (computed at lines 139-140) and existing `<TopNav />` render (line 173).

- [ ] **Step 1: Add imports**

At the top of `src/app/slate/page.tsx`, near the other slate imports, add:

```ts
import { SlateRail } from "@/components/slate/SlateRail";
import { buildRailGames } from "@/lib/rail";
```

- [ ] **Step 2: Compute the rail payload**

In the success render path, after the line `const gamesWithoutPicks = data.games.filter((g) => g.picks.length === 0);`, add:

```ts
const railGames = buildRailGames(gamesWithPicks, gamesWithoutPicks);
```

- [ ] **Step 3: Render the rail as a sibling of main**

In the main `return (<> ... </>)` success block, immediately after `<TopNav />` and before `<main ...>`, add the rail plus the sticky-safety comment:

```tsx
      <TopNav />
      {/* SlateRail is a SIBLING of <main>, never a wrapper. Do NOT wrap
          TopNav + SlateRail + main in a container with overflow or transform:
          it would break the nav sticky and the GameBlock sticky strips. */}
      <SlateRail games={railGames} />
      <main className="max-w-[920px] mx-auto px-4 sm:px-7 pb-24">
```

Do NOT add `<SlateRail />` to the `fetchError` return branch (lines 119-135). `SlateRail` already returns `null` when `games.length === 0`, so the empty slate case is handled.

- [ ] **Step 4: Typecheck, lint, build**

Run: `cd /d/capwatch-web && npx tsc --noEmit && npx eslint src/app/slate/page.tsx && npm run build`
Expected: type-clean, lint-clean, build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /d/capwatch-web && git add src/app/slate/page.tsx && git commit -m "feat(slate): render SlateRail on the slate page"
```

---

### Task 4: Anchor targets and card-strip offset

**Files:**
- Modify: `src/components/slate/GameBlock.tsx` (the `<section>` at lines 233-239 and the sticky strip `<div>` at lines 249-252)
- Modify: `src/components/slate/QuietGameStrip.tsx` (the `<div id=...>` at lines 33-36)

**Interfaces:**
- Consumes: nothing new. Adds the `data-slate-game` hook the observer queries and the `data-card-strip` hook the observer measures, plus `scroll-mt` so clicks land clear of both sticky bars.

- [ ] **Step 1: Add scroll margin and data hook to the GameBlock section**

In `src/components/slate/GameBlock.tsx`, change the opening `<section>` from:

```tsx
    <section
      id={`game-${game.game_id}`}
      className="relative rounded-2xl
                 bg-gradient-to-b from-[#15151a] via-[#101015] to-[#0b0b0f]
                 border border-[rgba(255,255,255,0.07)]
                 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.55)]"
    >
```

to:

```tsx
    <section
      id={`game-${game.game_id}`}
      data-slate-game={game.game_id}
      className="relative scroll-mt-[112px] xl:scroll-mt-[96px] rounded-2xl
                 bg-gradient-to-b from-[#15151a] via-[#101015] to-[#0b0b0f]
                 border border-[rgba(255,255,255,0.07)]
                 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.55)]"
    >
```

- [ ] **Step 2: Push the card sticky strip below the horizontal rail on small screens**

In the same file, change the sticky strip `<div>` from:

```tsx
      <div
        className="sticky top-16 z-20 bg-[#15151a]
                   border-t border-[rgba(255,255,255,0.10)]"
      >
```

to:

```tsx
      <div
        data-card-strip
        className="sticky top-[104px] xl:top-16 z-20 bg-[#15151a]
                   border-t border-[rgba(255,255,255,0.10)]"
      >
```

- [ ] **Step 3: Add scroll margin and data hook to the QuietGameStrip row**

In `src/components/slate/QuietGameStrip.tsx`, change the opening `<div>` from:

```tsx
    <div
      id={`game-${game.game_id}`}
      className="flex items-center justify-between gap-3 py-2 text-[12px]"
    >
```

to:

```tsx
    <div
      id={`game-${game.game_id}`}
      data-slate-game={game.game_id}
      className="flex items-center justify-between gap-3 py-2 text-[12px] scroll-mt-[112px] xl:scroll-mt-[96px]"
    >
```

- [ ] **Step 4: Typecheck, lint, build**

Run: `cd /d/capwatch-web && npx tsc --noEmit && npx eslint src/components/slate/GameBlock.tsx src/components/slate/QuietGameStrip.tsx && npm run build`
Expected: type-clean, lint-clean, build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /d/capwatch-web && git add src/components/slate/GameBlock.tsx src/components/slate/QuietGameStrip.tsx && git commit -m "feat(slate): anchor scroll-margin + card-strip offset for the rail"
```

---

### Task 5: Localhost verification pass

**Files:** none (verification only).

**Interfaces:** none.

This task confirms the behavior the unit tests cannot: layout, sticky, scroll landing, and scroll-spy. Run the dev server and check each item. Record the result of each check.

- [ ] **Step 1: Start the dev server**

Run: `cd /d/capwatch-web && npm run dev`
Open `http://localhost:3000/slate` (use a slate with several games; if today is quiet, add `?date=tomorrow`).

- [ ] **Step 2: Desktop vertical rail (>= 1280px)**

At browser widths 1280, 1360, 1440, and 1920px confirm:
- The vertical rail sits in the left gutter and does NOT overlap the 920px card column. If it kisses the column at 1280 to 1360, reduce the rail width to `w-[156px]` and adjust the `left` calc gap accordingly, then recheck.
- Rows show away logo, `AWY`, `@`, home logo, `HOM`, and a right-aligned status (time slot shows the unique sharp count pre-game, LIVE with inning when live, FINAL when done).
- The nav still pins at the top and each card scoreboard strip still pins under it (sticky not broken).

- [ ] **Step 3: Narrow horizontal strip (< 1280px)**

At 1279, 1024, 768, and 390px confirm:
- The rail is a horizontal logo strip pinned directly under the nav, swipeable left/right, logos only.
- The card column keeps its full width (no left occlusion, no cramped 2-column pick grid).
- Scroll down: the card scoreboard strip pins BELOW the horizontal rail (no overlap between the two bars). If they overlap, the `top-[104px]` offset on the card strip is wrong; recheck Task 4 Step 2.

- [ ] **Step 4: Click-to-scroll landing**

Click several rail entries at both desktop and narrow widths. Confirm each target game lands just under the nav with a little air (scoreboard readable, not hidden under the bars), scrolled smoothly. Test a game with a long pitcher line and a live 2-digit score. Toggle OS reduce-motion and confirm the jump is instant but still correctly offset.

- [ ] **Step 5: Scroll-spy**

Scroll the page slowly and confirm the active rail entry tracks the game in view, including the last game and any quiet games at the very bottom. Confirm the active highlight does not flicker during a fast scroll.

- [ ] **Step 6: Quiet games**

Confirm quiet (no-pick) games appear in the rail after the with-picks games, at reduced opacity, under a "Quiet" divider on desktop, and that clicking one scrolls to its strip.

- [ ] **Step 7: Final checks and commit any tuning**

Run: `cd /d/capwatch-web && npx vitest run && npm run lint && npm run build`
Expected: tests pass, lint clean, build succeeds. If any localhost tuning changed a file, commit it:

```bash
cd /d/capwatch-web && git add -A && git commit -m "fix(slate): rail localhost tuning"
```

---

## Self-Review

**Spec coverage:**
- Sibling-of-main keystone: Task 3 Step 3 (with comment). Covered.
- Desktop fixed vertical rail: Task 2. Covered.
- Narrow horizontal strip: Task 2. Covered.
- Scroll-spy (IntersectionObserver, rootMargin carving both bars, id-key rebind, rAF, guard, init): Task 2 Step 1. Covered.
- Anchor offset (scroll-margin, shared constants, card-strip top offset, reduced motion, history.replaceState): Task 2 (handler) + Task 4 (scroll-mt + card strip). Covered.
- RSC/client split + serializable RailGame: Task 1 (type + builder) + Task 3 (server compute, client render). Covered.
- Quiet games included and demoted: Task 1 (ordering) + Task 2 (opacity, divider). Covered.
- Aesthetic constraints (off-white active bar, flat chrome, tabular-nums): Task 2 + Global Constraints. Covered.
- Unique sharp count: Task 1 (`new Set(...).size`) + test. Covered.
- xl breakpoint: Global Constraints + Task 2 classes. Covered.
- Empty/error branches skip the rail: Task 3 Step 3 + `if (games.length === 0) return null`. Covered.

**Placeholder scan:** No TBD/TODO/"handle edge cases" left. Localhost tuning notes (rail width at 1280) are explicit conditional actions, not placeholders.

**Type consistency:** `RailGame`, `railLifecycle`, `buildRailGames`, `NAV_H`, `RAIL_STRIP_H` are defined in Task 1 and consumed with the same names/signatures in Tasks 2 and 3. `data-slate-game` and `data-card-strip` are produced in Task 4 and queried by the exact same strings in Task 2. `scroll-mt-[112px] xl:scroll-mt-[96px]` and `top-[104px] xl:top-16` match the Global Constraints math (64 + 40 + 8 = 112; 64 + 40 = 104).
