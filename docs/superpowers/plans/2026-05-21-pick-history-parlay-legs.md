# Pick History: Inline Parlay Legs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render per-leg W/L/push/pending glyphs and a tap-to-expand leg list on every parlay row in the capper page's Pick History and pending block, so visitors can see what the legs were even when the source tweet has been deleted.

**Architecture:** Two phases. Phase A extends the public capper profile endpoint in `fadeai-platform` to attach a `legs[]` array on every parlay item in `history` and `pending`. Phase B extends `capwatch-web` types, builds two new small components (`ParlayLegGlyphs`, `ParlayLegList`), and wires them into `HistoryTable` and `PendingBlock`.

**Tech Stack:** FastAPI + Supabase (Python 3) for the backend; Next.js (App Router) + React + Tailwind + vitest/@testing-library/react for the frontend. The spec is at `docs/superpowers/specs/2026-05-21-pick-history-parlay-legs-design.md`.

**Repos:**
- Backend: `D:/nba-totals-project/nba_platform/` (deploys to Railway, branch: `main`)
- Frontend: `D:/capwatch-web/` (deploys to Vercel, branch: `master`)

---

## File Structure

### Backend (`D:/nba-totals-project/nba_platform/`)

- **Modify:** `api/public_cappers.py` — extend `get_public_capper_profile()` to attach a `legs[]` array to every parlay item. Add a small in-module helper `_build_parlay_leg_payload()` that takes the already-fetched leg rows + per-leg grade map + game label map and returns the JSON shape the frontend wants.
- **Modify:** `tests/test_public_cappers.py` — add a smoke test that hits a known capper with parlay history and asserts the `legs` array shape on a parlay history item.

### Frontend (`D:/capwatch-web/`)

- **Modify:** `src/lib/types.ts` — add `HistoryPickLeg`, extend `HistoryPick` with `legs?: HistoryPickLeg[]`.
- **Create:** `src/components/capper/ParlayLegGlyphs.tsx` — pure presentational component that renders the horizontal glyph row given an array of leg outcomes.
- **Create:** `src/components/capper/ParlayLegList.tsx` — pure presentational component that renders the expanded leg list (selection text, odds, game label).
- **Modify:** `src/components/capper/HistoryTable.tsx` — render glyphs after the "N-leg parlay" label on both desktop and mobile views; add local expand state and the `ParlayLegList` block underneath when expanded.
- **Modify:** `src/components/capper/PendingBlock.tsx` — same treatment for live parlays.
- **Create:** `tests/components/ParlayLegGlyphs.test.tsx` — vitest unit test for glyph rendering across all four states.
- **Create:** `tests/components/ParlayLegList.test.tsx` — vitest unit test for expanded leg row rendering.
- **Modify:** `tests/components/HistoryTable.test.tsx` (create if missing) — verify a parlay history row renders glyphs and toggles the expand.

---

## Phase A — Backend: attach legs to parlay items

### Task A1: Add a smoke test for `legs[]` presence on parlay rows

**Files:**
- Modify: `D:/nba-totals-project/nba_platform/tests/test_public_cappers.py`

- [ ] **Step 1: Add a failing test**

Append the following test at the end of `tests/test_public_cappers.py`:

```python
def test_capper_profile_parlay_item_includes_legs():
    """
    Parlay items returned by the public capper profile must carry a `legs`
    array with one entry per leg. Each leg must declare an outcome letter
    matching the parlay leg's capper_grades row (or None when undecided).
    Smoke test against a known parlay-heavy capper.
    """
    r = client.get(
        "/api/public/cappers/riostaystrue",
        params={"window": "all_time", "bet_type": "parlays", "history_limit": 25},
    )
    assert r.status_code == 200
    body = r.json()

    # Find the first multi-leg parlay in the graded history (skip the
    # 1-leg-parlay-collapsed-to-straight edge case the endpoint handles).
    parlay = next(
        (it for it in body["history"]
         if it.get("kind") == "parlay" and (it.get("leg_count") or 0) >= 2),
        None,
    )
    if parlay is None:
        return  # smoke pass: no parlays in window

    assert "legs" in parlay, "parlay history item missing `legs`"
    legs = parlay["legs"]
    assert isinstance(legs, list)
    assert len(legs) == parlay["leg_count"], (
        f"leg array length {len(legs)} != leg_count {parlay['leg_count']}"
    )

    leg = legs[0]
    for field in ("leg_index", "market", "selection", "odds_taken",
                  "outcome", "game_label"):
        assert field in leg, f"leg missing field {field!r}"
    # Outcome letters mirror the parlay-level alphabet: W, L, P, or None.
    assert leg["outcome"] in ("W", "L", "P", None)
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `D:/nba-totals-project/nba_platform/`:

```
pytest tests/test_public_cappers.py::test_capper_profile_parlay_item_includes_legs -v
```

Expected: FAIL with `AssertionError: parlay history item missing 'legs'`.

- [ ] **Step 3: Commit**

```
git add tests/test_public_cappers.py
git commit -m "test(public_cappers): assert parlay items carry legs[]"
```

---

### Task A2: Fetch per-leg grades and game labels for parlay legs

**Files:**
- Modify: `D:/nba-totals-project/nba_platform/api/public_cappers.py` (around the `parlay_meta` build and the parlay item assembly loop)

**Context:** The endpoint already loads every parlay leg row into `parlay_legs` (variable defined near line 579). The `parlay_meta[pid]` dict tracks one entry per parlay. Per-leg `capper_grades` rows exist (written by `jobs/grade_capper_picks.py`) and are keyed by `pick_id`. Game labels for legs are not currently fetched because parlay rows themselves don't expose game_label.

- [ ] **Step 1: Build the per-leg grade map**

In `get_public_capper_profile()`, after the existing block that builds `straight_grade_map` (search for `straight_grade_map: dict = {}`), insert a parallel block that fetches grades for parlay leg pick ids.

Insert the following immediately after the `straight_grade_map` build (after line ~595):

```python
    # Per-leg grades for parlay legs. Each parlay leg has its own capper_grades
    # row written by grade_capper_picks.py; we need them to render per-leg
    # W/L/push glyphs on the capper page.
    leg_grade_map: dict = {}
    leg_ids = [p["id"] for p in parlay_legs]
    if leg_ids:
        for batch in [leg_ids[i:i + 200] for i in range(0, len(leg_ids), 200)]:
            grades = (
                db.table("capper_grades")
                .select("pick_id, outcome")
                .in_("pick_id", batch)
                .execute()
                .data
            ) or []
            for g in grades:
                leg_grade_map[g["pick_id"]] = g
```

- [ ] **Step 2: Pull leg game ids into the `game_label_map` lookup**

Find the existing block that builds `game_id_iter` (search for `game_id_iter: list = [p["game_id"] for p in straights`) and extend it to also include game ids from parlay legs.

Replace this existing block:

```python
    from core.game_meta import get_game_meta
    game_id_iter: list = [p["game_id"] for p in straights if p.get("game_id")]
    for m in parlay_meta.values():
        if m["leg_count"] == 1 and m.get("sole_leg") and m["sole_leg"].get("game_id"):
            game_id_iter.append(m["sole_leg"]["game_id"])
```

with this:

```python
    from core.game_meta import get_game_meta
    game_id_iter: list = [p["game_id"] for p in straights if p.get("game_id")]
    for m in parlay_meta.values():
        if m["leg_count"] == 1 and m.get("sole_leg") and m["sole_leg"].get("game_id"):
            game_id_iter.append(m["sole_leg"]["game_id"])
    # Multi-leg parlay legs also need labels for the expanded-leg list.
    for leg in parlay_legs:
        if leg.get("game_id"):
            game_id_iter.append(leg["game_id"])
```

- [ ] **Step 3: Commit**

```
git add api/public_cappers.py
git commit -m "feat(public_cappers): preload leg grades and leg game labels"
```

---

### Task A3: Attach a `legs[]` array to each multi-leg parlay item

**Files:**
- Modify: `D:/nba-totals-project/nba_platform/api/public_cappers.py` (the parlay-meta-to-item loop near line 745)

- [ ] **Step 1: Add the leg-payload builder helper**

Just above `def get_public_capper_profile(` (around line 466, after the existing helpers in the module), add:

```python
def _build_parlay_legs_payload(
    parlay_id: int,
    parlay_legs: list[dict],
    leg_grade_map: dict,
    game_label_map: dict,
    display_market_fn,
) -> list[dict]:
    """
    Build the per-leg payload for a single parlay's history item.

    Returns a list of dicts (leg_index ascending) with the shape consumed by
    capwatch-web's HistoryPickLeg type: leg_index, market, selection, line,
    odds_taken, outcome (W|L|P|None), game_label.
    """
    LETTER = {"win": "W", "loss": "L", "push": "P"}
    legs_for_pid = [leg for leg in parlay_legs if leg.get("parlay_id") == parlay_id]
    # Stable ordering: by posted_at ascending then by capper_picks.id as a
    # tiebreaker. Mirrors the order legs were parsed off the source post.
    legs_for_pid.sort(key=lambda leg: (leg.get("posted_at") or "", leg.get("id") or 0))

    out: list[dict] = []
    for idx, leg in enumerate(legs_for_pid):
        grade = leg_grade_map.get(leg["id"])
        outcome_letter = None
        if grade and grade.get("outcome") in LETTER:
            outcome_letter = LETTER[grade["outcome"]]
        out.append({
            "leg_index": idx,
            "market": display_market_fn(leg),
            "selection": leg.get("selection"),
            "line": leg.get("line"),
            "odds_taken": leg.get("odds_taken"),
            "outcome": outcome_letter,
            "game_label": (
                game_label_map.get(str(leg.get("game_id")))
                if leg.get("game_id") is not None else None
            ),
        })
    return out
```

- [ ] **Step 2: Attach `legs` to multi-leg parlay items**

Find the multi-leg parlay item append in `get_public_capper_profile()` (search for `"selection": f"{m['leg_count']}-leg parlay",`). Modify the dict literal to add a `legs` field.

Replace this existing block:

```python
        items.append({
            "id": m["first_id"],
            "kind": "parlay",
            "parlay_id": pid,
            "leg_count": m["leg_count"],
            "game_label": None,
            "market": "Parlay",
            "selection": f"{m['leg_count']}-leg parlay",
            "line": None,
            "odds_taken": None,
            "units": m.get("stake"),
            "outcome": outcome_letter,
            "profit_units": normalized_profit,
            "posted_at": m["posted_at"],
            "tweet_url": _tweet_url(m.get("raw_id")),
            "_raw_id": m.get("raw_id"),
            "_game_start": None,
            "source": None,
        })
```

with this:

```python
        items.append({
            "id": m["first_id"],
            "kind": "parlay",
            "parlay_id": pid,
            "leg_count": m["leg_count"],
            "game_label": None,
            "market": "Parlay",
            "selection": f"{m['leg_count']}-leg parlay",
            "line": None,
            "odds_taken": None,
            "units": m.get("stake"),
            "outcome": outcome_letter,
            "profit_units": normalized_profit,
            "posted_at": m["posted_at"],
            "tweet_url": _tweet_url(m.get("raw_id")),
            "_raw_id": m.get("raw_id"),
            "_game_start": None,
            "source": None,
            "legs": _build_parlay_legs_payload(
                pid, parlay_legs, leg_grade_map, game_label_map, display_market,
            ),
        })
```

- [ ] **Step 3: Run the smoke test to verify it passes**

Run from `D:/nba-totals-project/nba_platform/`:

```
pytest tests/test_public_cappers.py::test_capper_profile_parlay_item_includes_legs -v
```

Expected: PASS.

- [ ] **Step 4: Run the full module test file to confirm no regressions**

```
pytest tests/test_public_cappers.py -v
```

Expected: ALL PASS.

- [ ] **Step 5: Commit**

```
git add api/public_cappers.py
git commit -m "feat(public_cappers): attach legs[] to parlay history items"
```

---

## Phase B — Frontend: render glyphs and expanded leg list

### Task B1: Extend frontend types

**Files:**
- Modify: `D:/capwatch-web/src/lib/types.ts`

- [ ] **Step 1: Add `HistoryPickLeg` and extend `HistoryPick`**

In `src/lib/types.ts`, add the `HistoryPickLeg` interface immediately above the existing `HistoryPick` interface (line 164):

```ts
export interface HistoryPickLeg {
  leg_index: number;
  market: string | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  /** W / L / P, or null when the leg is still undecided (live parlay). */
  outcome: "W" | "L" | "P" | null;
  game_label: string | null;
}
```

Then add a `legs` field to `HistoryPick` (currently around line 164-189). Insert the new field immediately above the existing `was_deleted_on_x?: boolean;` line:

```ts
  /** Present on parlay rows. Ordered by parsed leg index ascending. */
  legs?: HistoryPickLeg[];
```

- [ ] **Step 2: Run the typecheck**

Run from `D:/capwatch-web/`:

```
npx tsc --noEmit
```

Expected: PASS (no new errors). If the project has any other type checker config, run it now too.

- [ ] **Step 3: Commit**

```
git add src/lib/types.ts
git commit -m "feat(types): add HistoryPickLeg and HistoryPick.legs"
```

---

### Task B2: Build the `ParlayLegGlyphs` component

**Files:**
- Create: `D:/capwatch-web/src/components/capper/ParlayLegGlyphs.tsx`
- Create: `D:/capwatch-web/tests/components/ParlayLegGlyphs.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/ParlayLegGlyphs.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ParlayLegGlyphs } from "@/components/capper/ParlayLegGlyphs";
import type { HistoryPickLeg } from "@/lib/types";

function makeLeg(overrides: Partial<HistoryPickLeg> = {}): HistoryPickLeg {
  return {
    leg_index: 0,
    market: "ml",
    selection: "Some team",
    line: null,
    odds_taken: -110,
    outcome: "W",
    game_label: "NYY @ BOS",
    ...overrides,
  };
}

describe("ParlayLegGlyphs", () => {
  it("renders one glyph per leg in order", () => {
    const legs = [
      makeLeg({ leg_index: 0, outcome: "W" }),
      makeLeg({ leg_index: 1, outcome: "W" }),
      makeLeg({ leg_index: 2, outcome: "L" }),
    ];
    render(<ParlayLegGlyphs legs={legs} />);
    const glyphs = screen.getAllByTestId("parlay-leg-glyph");
    expect(glyphs).toHaveLength(3);
    expect(glyphs[0]).toHaveAttribute("data-outcome", "W");
    expect(glyphs[1]).toHaveAttribute("data-outcome", "W");
    expect(glyphs[2]).toHaveAttribute("data-outcome", "L");
  });

  it("renders the push glyph for outcome P", () => {
    render(<ParlayLegGlyphs legs={[makeLeg({ outcome: "P" })]} />);
    const glyph = screen.getByTestId("parlay-leg-glyph");
    expect(glyph).toHaveAttribute("data-outcome", "P");
  });

  it("renders the pending glyph for outcome null", () => {
    render(<ParlayLegGlyphs legs={[makeLeg({ outcome: null })]} />);
    const glyph = screen.getByTestId("parlay-leg-glyph");
    expect(glyph).toHaveAttribute("data-outcome", "pending");
  });

  it("renders the leg selection as a hover title", () => {
    render(<ParlayLegGlyphs legs={[makeLeg({ selection: "Acuna over 1.5 bases" })]} />);
    expect(screen.getByTestId("parlay-leg-glyph")).toHaveAttribute(
      "title",
      "Acuna over 1.5 bases"
    );
  });

  it("returns null when legs is empty or undefined", () => {
    const { container: emptyContainer } = render(<ParlayLegGlyphs legs={[]} />);
    expect(emptyContainer.firstChild).toBeNull();
    const { container: undefContainer } = render(<ParlayLegGlyphs />);
    expect(undefContainer.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `D:/capwatch-web/`:

```
npx vitest run tests/components/ParlayLegGlyphs.test.tsx
```

Expected: FAIL with module-not-found on `@/components/capper/ParlayLegGlyphs`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/capper/ParlayLegGlyphs.tsx`:

```tsx
import type { HistoryPickLeg } from "@/lib/types";

const GLYPH_CONTENT: Record<string, string> = {
  W: "✓",        // check
  L: "✗",        // cross
  P: "–",        // en dash
  pending: "",        // empty tile with dashed outline
};

const GLYPH_CLASS: Record<string, string> = {
  W: "bg-[rgba(72,213,151,0.15)] text-[var(--color-pos)]",
  L: "bg-[rgba(255,90,90,0.18)] text-[var(--color-neg)]",
  P: "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-muted)] font-bold",
  pending: "bg-[rgba(255,255,255,0.04)] border border-dashed border-[rgba(255,255,255,0.22)]",
};

export function ParlayLegGlyphs({ legs }: { legs?: HistoryPickLeg[] }) {
  if (!legs || legs.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-[3px] align-middle">
      {legs.map((leg) => {
        const key = leg.outcome ?? "pending";
        const content = GLYPH_CONTENT[key] ?? "";
        const cls = GLYPH_CLASS[key] ?? GLYPH_CLASS.pending;
        return (
          <span
            key={leg.leg_index}
            data-testid="parlay-leg-glyph"
            data-outcome={key}
            title={leg.selection ?? undefined}
            className={`inline-flex w-[15px] h-[15px] rounded-[3px] items-center justify-center text-[10px] leading-none ${cls}`}
          >
            {content}
          </span>
        );
      })}
    </span>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```
npx vitest run tests/components/ParlayLegGlyphs.test.tsx
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```
git add src/components/capper/ParlayLegGlyphs.tsx tests/components/ParlayLegGlyphs.test.tsx
git commit -m "feat(capper): ParlayLegGlyphs primitive"
```

---

### Task B3: Build the `ParlayLegList` component (expanded view)

**Files:**
- Create: `D:/capwatch-web/src/components/capper/ParlayLegList.tsx`
- Create: `D:/capwatch-web/tests/components/ParlayLegList.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/ParlayLegList.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ParlayLegList } from "@/components/capper/ParlayLegList";
import type { HistoryPickLeg } from "@/lib/types";

const legs: HistoryPickLeg[] = [
  {
    leg_index: 0,
    market: "prop",
    selection: "Acuna over 1.5 bases",
    line: 1.5,
    odds_taken: 115,
    outcome: "W",
    game_label: "ATL @ MIA",
  },
  {
    leg_index: 1,
    market: "prop",
    selection: "Judge HR anytime",
    line: null,
    odds_taken: 340,
    outcome: "L",
    game_label: "NYY @ BOS",
  },
];

describe("ParlayLegList", () => {
  it("renders one row per leg with selection text", () => {
    render(<ParlayLegList legs={legs} />);
    expect(screen.getByText("Acuna over 1.5 bases")).toBeInTheDocument();
    expect(screen.getByText("Judge HR anytime")).toBeInTheDocument();
  });

  it("renders positive odds with a plus sign and negative odds bare", () => {
    render(<ParlayLegList legs={[
      { ...legs[0], odds_taken: 115 },
      { ...legs[1], odds_taken: -130 },
    ]} />);
    expect(screen.getByText("+115")).toBeInTheDocument();
    expect(screen.getByText("-130")).toBeInTheDocument();
  });

  it("renders the game label", () => {
    render(<ParlayLegList legs={legs} />);
    expect(screen.getByText("ATL @ MIA")).toBeInTheDocument();
    expect(screen.getByText("NYY @ BOS")).toBeInTheDocument();
  });

  it("returns null when legs is empty", () => {
    const { container } = render(<ParlayLegList legs={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```
npx vitest run tests/components/ParlayLegList.test.tsx
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/capper/ParlayLegList.tsx`:

```tsx
import type { HistoryPickLeg } from "@/lib/types";

function formatOdds(odds: number | null): string {
  if (odds == null) return "";
  return odds > 0 ? `+${odds}` : String(odds);
}

function GlyphFor({ outcome }: { outcome: HistoryPickLeg["outcome"] }) {
  const cls =
    outcome === "W"
      ? "text-[var(--color-pos)]"
      : outcome === "L"
        ? "text-[var(--color-neg)]"
        : outcome === "P"
          ? "text-[var(--color-text-muted)] font-bold"
          : "text-[var(--color-text-muted)] opacity-40";
  const glyph =
    outcome === "W" ? "✓"
      : outcome === "L" ? "✗"
      : outcome === "P" ? "–"
      : "·";
  return <span className={`inline-block w-3 text-[11px] ${cls}`}>{glyph}</span>;
}

export function ParlayLegList({ legs }: { legs: HistoryPickLeg[] }) {
  if (!legs || legs.length === 0) return null;
  return (
    <div className="pl-[76px] pr-5 pb-3 pt-1 text-[12px] border-b border-[rgba(255,255,255,0.035)] bg-[rgba(255,255,255,0.012)]">
      {legs.map((leg) => (
        <div
          key={leg.leg_index}
          className="grid grid-cols-[18px_minmax(0,1fr)_auto_90px] gap-3 items-center py-1 text-[var(--color-text-soft)]"
        >
          <GlyphFor outcome={leg.outcome} />
          <span className="truncate">{leg.selection ?? ""}</span>
          <span className="tabular-nums text-[var(--color-text-muted)] text-[11px]">
            {formatOdds(leg.odds_taken)}
          </span>
          <span className="text-right text-[10px] text-[var(--color-text-muted)]">
            {leg.game_label ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```
npx vitest run tests/components/ParlayLegList.test.tsx
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```
git add src/components/capper/ParlayLegList.tsx tests/components/ParlayLegList.test.tsx
git commit -m "feat(capper): ParlayLegList expanded view"
```

---

### Task B4: Wire glyphs and expand into `HistoryTable`

**Files:**
- Modify: `D:/capwatch-web/src/components/capper/HistoryTable.tsx`

**Context:** `HistoryRow` currently renders a non-stateful row. We need to make it stateful (a `useState` for `expanded`), wire glyphs into both the desktop grid and the mobile card, and render `ParlayLegList` directly under the row when expanded. Because `HistoryRow` will now have state, the file must add `"use client"` at the top.

- [ ] **Step 1: Make the table client-side and import new pieces**

At the very top of `src/components/capper/HistoryTable.tsx`, prepend:

```tsx
"use client";
```

Then add to the existing import block at the top:

```tsx
import { useState } from "react";
import { ParlayLegGlyphs } from "@/components/capper/ParlayLegGlyphs";
import { ParlayLegList } from "@/components/capper/ParlayLegList";
```

- [ ] **Step 2: Render glyphs inside the desktop selection cell**

Find the existing `selectionNode` definition (currently around line 146-157) and the desktop selection cell that uses it.

Replace this existing block:

```tsx
  const selectionNode = (
    <span className={`font-bold ${isParlay ? "text-[var(--color-gold)]" : "text-[var(--color-text)]"}`}>
      {formatBetDescriptor({
        kind: isParlay ? "parlay" : "straight",
        leg_count: pick.leg_count ?? null,
        market: pick.market,
        selection: pick.selection,
        line: pick.line,
        odds_taken: pick.odds_taken,
      })}
    </span>
  );
```

with this:

```tsx
  const selectionNode = (
    <>
      <span className={`font-bold ${isParlay ? "text-[var(--color-gold)]" : "text-[var(--color-text)]"}`}>
        {formatBetDescriptor({
          kind: isParlay ? "parlay" : "straight",
          leg_count: pick.leg_count ?? null,
          market: pick.market,
          selection: pick.selection,
          line: pick.line,
          odds_taken: pick.odds_taken,
        })}
      </span>
      {isParlay && pick.legs && pick.legs.length > 0 && (
        <>
          {" "}
          <ParlayLegGlyphs legs={pick.legs} />
        </>
      )}
    </>
  );
```

- [ ] **Step 3: Add expand state and the expand affordance**

Inside the `HistoryRow` function body, immediately after the existing destructure/derived constants (after `const unitsValue = ...;` around line 144), add:

```tsx
  const hasExpandableLegs = isParlay && !!pick.legs && pick.legs.length > 0;
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => {
    if (hasExpandableLegs) setExpanded((v) => !v);
  };
```

- [ ] **Step 4: Wrap the desktop grid in a clickable container that toggles expand and append the `ParlayLegList` underneath**

Find the outer `<>` fragment that holds the desktop and mobile views inside `HistoryRow` (return statement around line 159-377). Make the desktop grid `<div>` clickable.

Replace this existing block:

```tsx
      <div
        className={`group/row relative ${DESKTOP_GRID} pl-[19px] pr-5 py-3.5
                    hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-150
                    ${isLast ? "" : "sm:border-b sm:border-[rgba(255,255,255,0.035)]"}`}
      >
```

with this:

```tsx
      <div
        onClick={hasExpandableLegs ? toggleExpanded : undefined}
        className={`group/row relative ${DESKTOP_GRID} pl-[19px] pr-5 py-3.5
                    hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-150
                    ${hasExpandableLegs ? "cursor-pointer" : ""}
                    ${isLast && !expanded ? "" : "sm:border-b sm:border-[rgba(255,255,255,0.035)]"}`}
      >
```

Immediately AFTER the closing `</div>` of the desktop grid block (just before the `<div className="sm:hidden relative pl-4 pr-4 py-3 ..."` mobile block), insert:

```tsx
      {hasExpandableLegs && expanded && (
        <div className="hidden sm:block">
          <ParlayLegList legs={pick.legs!} />
        </div>
      )}
```

- [ ] **Step 5: Stop the X/tweet icon from toggling expand**

Inside the desktop grid block, find the cell that holds the tweet/deletion icon (the last grid column, currently around lines 237-273). Add an `onClick` stop-propagation on the link/span wrapper so clicking the icon does not toggle the row.

Replace this existing block:

```tsx
        <div className="flex justify-end">
          {pick.deleted_after_game_start ? (
            <span
              aria-label="Tweet deleted after first pitch"
              title="The capper deleted this tweet AFTER the game started. TailSlips kept the receipt."
              className="inline-flex w-7 h-7 items-center justify-center rounded-md
                         bg-[rgba(239,68,68,0.10)] text-[#ef4444] opacity-90"
            >
              <XIcon size={11} />
            </span>
          ) : pick.was_deleted_on_x ? (
            <span
              aria-label="Tweet deleted by capper"
              title="The capper deleted this tweet. TailSlips kept the receipt."
              className="inline-flex w-7 h-7 items-center justify-center rounded-md
                         bg-[rgba(245,158,11,0.08)] text-[#f59e0b] opacity-90"
            >
              <XIcon size={11} />
            </span>
          ) : pick.tweet_url ? (
            <a
              href={pick.tweet_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View tweet"
              className="inline-flex w-7 h-7 items-center justify-center rounded-md
                         text-[var(--color-text-muted)]
                         opacity-0 group-hover/row:opacity-100
                         hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--color-text)]
                         transition-all duration-150"
            >
              <XIcon size={11} />
            </a>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
```

with this:

```tsx
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          {pick.deleted_after_game_start ? (
            <span
              aria-label="Tweet deleted after first pitch"
              title="The capper deleted this tweet AFTER the game started. TailSlips kept the receipt."
              className="inline-flex w-7 h-7 items-center justify-center rounded-md
                         bg-[rgba(239,68,68,0.10)] text-[#ef4444] opacity-90"
            >
              <XIcon size={11} />
            </span>
          ) : pick.was_deleted_on_x ? (
            <span
              aria-label="Tweet deleted by capper"
              title="The capper deleted this tweet. TailSlips kept the receipt."
              className="inline-flex w-7 h-7 items-center justify-center rounded-md
                         bg-[rgba(245,158,11,0.08)] text-[#f59e0b] opacity-90"
            >
              <XIcon size={11} />
            </span>
          ) : pick.tweet_url ? (
            <a
              href={pick.tweet_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View tweet"
              className="inline-flex w-7 h-7 items-center justify-center rounded-md
                         text-[var(--color-text-muted)]
                         opacity-0 group-hover/row:opacity-100
                         hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--color-text)]
                         transition-all duration-150"
            >
              <XIcon size={11} />
            </a>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
```

- [ ] **Step 6: Mobile card — clickable + expanded list**

Find the mobile card outer div (currently `<div className="sm:hidden relative pl-4 pr-4 py-3 ...">` around line 277). Make it clickable and append the leg list at the bottom when expanded.

Replace this existing block:

```tsx
      <div
        className={`sm:hidden relative pl-4 pr-4 py-3
                    ${isLast ? "" : "border-b border-[rgba(255,255,255,0.035)]"}`}
      >
```

with this:

```tsx
      <div
        onClick={hasExpandableLegs ? toggleExpanded : undefined}
        className={`sm:hidden relative pl-4 pr-4 py-3
                    ${hasExpandableLegs ? "cursor-pointer" : ""}
                    ${isLast && !expanded ? "" : "border-b border-[rgba(255,255,255,0.035)]"}`}
      >
```

Inside the same mobile card, find the closing `</div>` of the card (the last `</div>` before the closing fragment `</>`). Immediately BEFORE that closing `</div>`, insert:

```tsx
        {hasExpandableLegs && expanded && (
          <div className="-mx-4 mt-2 sm:hidden">
            <ParlayLegList legs={pick.legs!} />
          </div>
        )}
```

- [ ] **Step 7: Run the typecheck and full vitest suite**

```
npx tsc --noEmit
npx vitest run
```

Expected: PASS. (No new tests added in this task; existing ParlayLegGlyphs / ParlayLegList suites should still pass.)

- [ ] **Step 8: Manually verify in the browser**

Run the dev server: `npm run dev` from `D:/capwatch-web/`. Open `http://localhost:3000/cappers/riostaystrue`. Expected:
1. Every parlay row shows the glyph sequence after "N-leg parlay".
2. Clicking the row body expands a leg list below it.
3. Clicking again collapses it.
4. Clicking the X/tweet icon does not toggle the expand.
5. The "Deleted after first pitch" badge still renders.

If anything looks wrong, fix it before committing.

- [ ] **Step 9: Commit**

```
git add src/components/capper/HistoryTable.tsx
git commit -m "feat(capper): inline parlay legs + expand on history rows"
```

---

### Task B5: Wire the same treatment into `PendingBlock`

**Files:**
- Modify: `D:/capwatch-web/src/components/capper/PendingBlock.tsx`

**Context:** `PendingBlock` currently renders pending picks as a list. Pending parlays need the same glyph row (with `pending` glyphs for legs that have not graded yet) and the same expand affordance. Read the current shape of the file first to find the correct insertion point; the structure mirrors `HistoryTable` but is simpler because pending rows are stacked cards rather than a table grid.

- [ ] **Step 1: Read `PendingBlock.tsx` to identify the per-row render block**

Open `src/components/capper/PendingBlock.tsx`. Find the inner per-pick render block (a `picks.map((p) => ...)` or `picks.map((pick) => ...)`). Note where the row's main label is rendered — that is where the glyph row will be inserted.

- [ ] **Step 2: Add the imports**

At the top of `src/components/capper/PendingBlock.tsx`, ensure `"use client"` is on line 1 (add it if missing). Add to the imports block:

```tsx
import { useState } from "react";
import { ParlayLegGlyphs } from "@/components/capper/ParlayLegGlyphs";
import { ParlayLegList } from "@/components/capper/ParlayLegList";
```

- [ ] **Step 3: For each pending pick, render glyphs after the label**

Inside the per-pick render block, right after the existing "N-leg parlay" label (or wherever `formatBetDescriptor(...)` is rendered for parlay picks), append:

```tsx
{p.kind === "parlay" && p.legs && p.legs.length > 0 && (
  <>
    {" "}
    <ParlayLegGlyphs legs={p.legs} />
  </>
)}
```

- [ ] **Step 4: Add expand state per row, wrap the card to toggle, and append `ParlayLegList`**

The simplest approach is to extract the per-pick render block into a small inner component declared at the bottom of the file (or just above the `PendingBlock` export), so each row owns its own `useState`. Match whatever shape currently surrounds the map.

If the map is currently `picks.map((p) => ( <CardJSX /> ))`, refactor it to call a small `<PendingRow pick={p} sportsbooks={sportsbooks} />` inner component defined immediately above `PendingBlock`. Move the existing card JSX into `PendingRow`. Then inside `PendingRow`:

```tsx
const isParlay = pick.kind === "parlay";
const hasExpandableLegs = isParlay && !!pick.legs && pick.legs.length > 0;
const [expanded, setExpanded] = useState(false);
const toggleExpanded = () => {
  if (hasExpandableLegs) setExpanded((v) => !v);
};
```

Wrap the outer card div with `onClick={hasExpandableLegs ? toggleExpanded : undefined}` and `className={\`... ${hasExpandableLegs ? "cursor-pointer" : ""}\`}`. Immediately AFTER the card's main content (before the closing `</div>` of the card), insert:

```tsx
{hasExpandableLegs && expanded && <ParlayLegList legs={pick.legs!} />}
```

If any inner interactive child (sportsbook picker, share button, deletion icon) sits inside the card, wrap its container with `onClick={(e) => e.stopPropagation()}` so its click does not bubble up and toggle the expand.

- [ ] **Step 5: Run the typecheck and vitest**

```
npx tsc --noEmit
npx vitest run
```

Expected: PASS.

- [ ] **Step 6: Manually verify**

`npm run dev`, open a capper page with a live pending parlay (David can name one, otherwise check `/cappers` for any tracked capper with a live block). Expected:
1. Pending parlay shows the glyph row.
2. Already-decided legs render W/L/P. Undecided legs render with the dashed pending glyph.
3. Clicking the pending parlay row body toggles the expand.
4. The AffiliatePicker and any other interactive widget inside the card still works without toggling the expand.

- [ ] **Step 7: Commit**

```
git add src/components/capper/PendingBlock.tsx
git commit -m "feat(capper): inline parlay legs + expand on pending block"
```

---

### Task B6: End-to-end manual smoke

**Files:** None modified.

- [ ] **Step 1: Run the full local pipeline**

From `D:/capwatch-web/`:

```
npm run dev
```

Open `http://localhost:3000/cappers/riostaystrue` (parlay-heavy capper). Verify the full feature end-to-end:

1. Pick History rows for parlays show glyphs at natural 15px size, immediately after the "N-leg parlay" label, in chronological leg order.
2. The 6-leg+ parlays render without capping or shrinking and the rest of the row's columns stay aligned.
3. Clicking a parlay row body expands the leg list directly underneath; clicking again collapses.
4. Each expanded leg row shows selection text, odds (with `+` sign for positive), and game label.
5. A parlay row with the "Deleted after first pitch" badge still expands to reveal its legs.
6. The X/tweet icon column still works as a link without toggling the expand.
7. The mobile breakpoint (resize to <640px) renders glyphs on the same line as the "N-leg parlay" label inside the stacked card; tapping toggles the expanded list.
8. Live pending parlays in the PendingBlock show glyphs (with pending glyphs for undecided legs) and expand the same way.

- [ ] **Step 2: Confirm no console errors**

Open browser devtools. Reload the page. There must be zero red errors in the console. React warnings (key, etc.) also count as failures and must be fixed.

- [ ] **Step 3: Cross-check a deleted parlay**

Find a parlay row marked "Deleted after first pitch" on a tracked capper (e.g. `@riostaystrue` May 20 entry per the original screenshot). Confirm that expanding it reveals the full leg list with the same selection text it had before the source tweet was deleted. This is the motivating use case.

- [ ] **Step 4: No commit**

This task has no file changes. If any defect was found in steps 1-3, fix it inline and commit with an appropriate `fix(capper):` message rather than continuing.

---

## Out of Scope (deferred — do not implement)

- Combined parlay odds in the table.
- Per-pick permalinks (`/cappers/<handle>/picks/<id>`).
- Per-leg action photos / scoreboards inside the expand (Parlay Palace remains the home for that).
- Animation on expand/collapse.
- Per-leg sortable history filter.

## Spec Reference

Full design rationale, glyph state table, mobile behavior, and risk notes:
`docs/superpowers/specs/2026-05-21-pick-history-parlay-legs-design.md`.
