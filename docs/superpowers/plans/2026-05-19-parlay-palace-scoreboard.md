# Parlay Palace Scoreboard Upgrade — Implementation Plan

> Agentic workers: execute task-by-task with spec + code-quality review per task. Checkbox steps.

**Goal:** Make the Parlay Palace detail page tell the story of the parlay HITTING, not show a pre-game slip: per-leg final scores + green W, team logos/color, a compounding payout ladder, and entrance motion.

**Architecture:** Backend `core/parlay_palace_enrich.py` gains per-leg final score + winner + team logos via MLB statsapi (keyed by the gamePk already in `game_id`). Frontend `PalaceLeg`/`PalaceBody` types extend; `LegRow` becomes a scoreboard row (logo, score, green W, sequential numbering + clincher tag); a new `PayoutLadder` shows cumulative units; a small client component animates the hero count-up + staggered leg reveal.

**Tech stack:** FastAPI/Supabase/pytest (BE: `D:/nba-totals-project/nba_platform`). Next.js 16/React 19/Tailwind v4/Vitest (FE: `D:/capwatch-web`). Both on branch `feat/parlay-palace-scoreboard`. `BE:`/`FE:` repo prefixes. Stage only named files; never `git add -A`. No em dashes anywhere. MLB media hotlink-only (URL strings; logos hotlinked, never rehosted; `next.config` remotePatterns untouched).

---

### Task 1 (BE): enrich legs with final score, winner, team logos

**Files:** Modify `core/parlay_palace_enrich.py`. Test: `tests/core/test_parlay_palace_enrich.py`.

Add an MLB linescore+teams fetch keyed by gamePk and a per-leg result/score/logo builder. MLB endpoints (verified, no auth): `https://statsapi.mlb.com/api/v1/game/{gamePk}/linescore` → `teams.home.runs`,`teams.away.runs`; `https://statsapi.mlb.com/api/v1/game/{gamePk}/boxscore` (already fetched) → `teams.{side}.team.id|name|abbreviation`. Team logo (hotlink): `https://www.mlbstatic.com/team-logos/{teamId}.svg`.

- [ ] **Step 1: failing test** — append to `tests/core/test_parlay_palace_enrich.py`:

```python
def test_enrich_team_leg_gets_score_and_logos(monkeypatch):
    from core.parlay_palace_query import ParlayCandidate, Leg
    cand = ParlayCandidate(
        parlay_id=5, capper_id=1, capper_handle="x", capper_display_name="X",
        capper_image_url=None, combined_odds=2598, profit_units=37.02,
        leg_count=2, total_legs=2, graded_at="2026-05-13T04:00:00Z",
        mlb_leg_count=2,
        legs=[
            Leg(0, "777001", "ml", "Boston Red Sox", None, -102, None, None,
                "2026-05-13T18:00:00Z"),
            Leg(1, "777002", "total", "OVER", 7.5, -114, None, None,
                "2026-05-13T20:00:00Z"),
        ],
    )
    def fake_box(pk):
        return {"777001": {"pitchers_by_id": {},
                 "teams": {"home": {"id": 111, "name": "Boston Red Sox", "abbr": "BOS"},
                           "away": {"id": 147, "name": "New York Yankees", "abbr": "NYY"}}},
                "777002": {"pitchers_by_id": {},
                 "teams": {"home": {"id": 135, "name": "San Diego Padres", "abbr": "SD"},
                           "away": {"id": 119, "name": "Los Angeles Dodgers", "abbr": "LAD"}}}}[str(pk)]
    def fake_line(pk):
        return {"777001": {"home_runs": 6, "away_runs": 2},
                "777002": {"home_runs": 5, "away_runs": 7}}[str(pk)]
    def fake_content(pk): return {"photo_url": None, "clip_url": None}
    monkeypatch.setattr("core.parlay_palace_enrich.fetch_boxscore", fake_box)
    monkeypatch.setattr("core.parlay_palace_enrich.fetch_linescore", fake_line)
    monkeypatch.setattr("core.parlay_palace_enrich.fetch_content", fake_content)
    body = enrich_candidate(cand)
    l0 = body["legs"][0]
    assert l0["score_text"] == "BOS 6, NYY 2"
    assert l0["won"] is True
    assert l0["team_logo_url"] == "https://www.mlbstatic.com/team-logos/111.svg"
    assert l0["team_abbr"] == "BOS"
    l1 = body["legs"][1]
    assert l1["score_text"] == "12 R"          # total: combined runs
    assert l1["result_text"] == "Over 7.5"
    assert l1["won"] is True
```

- [ ] **Step 2:** run `python -m pytest tests/core/test_parlay_palace_enrich.py -v` → the new test FAILS (no `fetch_linescore`, no score keys), the 3 existing tests still PASS.

- [ ] **Step 3:** implement. Add to `core/parlay_palace_enrich.py`:

```python
def fetch_linescore(game_pk: str) -> dict:
    """Final runs by side. {'home_runs': int|None, 'away_runs': int|None}."""
    try:
        data = _get_json(f"{_BASE}/{game_pk}/linescore")
    except Exception as exc:
        _log.warning("fetch_linescore failed for game_pk=%s: %r", game_pk, exc)
        return {"home_runs": None, "away_runs": None}
    t = data.get("teams") or {}
    return {
        "home_runs": (t.get("home") or {}).get("runs"),
        "away_runs": (t.get("away") or {}).get("runs"),
    }
```

In `fetch_boxscore`, also extract team identity. After the existing pitcher loop, before `return out`, add:

```python
    out["teams"] = {}
    for side in ("home", "away"):
        team = ((data.get("teams", {}).get(side, {}) or {}).get("team") or {})
        out["teams"][side] = {
            "id": team.get("id"),
            "name": team.get("name"),
            "abbr": team.get("abbreviation"),
        }
```

Add a team-resolution + result helper:

```python
def _norm(s):
    return (s or "").strip().lower()


def _leg_team_result(leg, box: dict, line: dict) -> dict:
    """Score text, win flag, team logo/abbr for a leg. Parlay legs are all
    winners, so 'won' is True when scores are present."""
    teams = box.get("teams") or {}
    home, away = teams.get("home") or {}, teams.get("away") or {}
    hr, ar = line.get("home_runs"), line.get("away_runs")
    have = hr is not None and ar is not None
    market = (leg.market or "").lower()
    out = {"score_text": None, "result_text": None, "won": None,
           "team_logo_url": None, "team_abbr": None}

    def logo(tid):
        return f"https://www.mlbstatic.com/team-logos/{tid}.svg" if tid else None

    if market == "total":
        if have:
            out["score_text"] = f"{hr + ar} R"
            out["won"] = True
        if leg.line is not None and leg.selection:
            out["result_text"] = f"{leg.selection.title()} {leg.line}"
        return out

    # team markets (ml, spread, runline): match selection to a side
    sel = _norm(leg.selection)
    pick = None
    for side, t in (("home", home), ("away", away)):
        nm, ab = _norm(t.get("name")), _norm(t.get("abbr"))
        if sel and (sel == nm or sel == ab or sel in nm or (ab and ab in sel)):
            pick = (side, t)
            break
    if pick:
        side, t = pick
        out["team_abbr"] = t.get("abbr")
        out["team_logo_url"] = logo(t.get("id"))
    if have:
        win_abbr = (home if hr > ar else away).get("abbr")
        lose_abbr = (away if hr > ar else home).get("abbr")
        hi, lo = max(hr, ar), min(hr, ar)
        out["score_text"] = f"{win_abbr} {hi}, {lose_abbr} {lo}"
        out["won"] = True
    return out
```

In `enrich_candidate`: add a `line_cache` mirroring `box_cache`/`content_cache`:

```python
    line_cache: dict[str, dict] = {}

    def line_for(gid: str) -> dict:
        if gid not in line_cache:
            line_cache[gid] = fetch_linescore(gid) if gid else {"home_runs": None, "away_runs": None}
        return line_cache[gid]
```

In the `for leg in cand.legs:` loop, after computing `box`, also get `line = line_for(leg.game_id) if leg.game_id else {"home_runs": None, "away_runs": None}` and merge the team-result keys into the leg dict. The existing prop `result_text` (e.g. "8 K") must still win for prop legs: keep `"result_text": _result_text(leg, box)` then overlay team result only when the prop result is None:

```python
        tr = _leg_team_result(leg, box, line)
        prop_rt = _result_text(leg, box)
        legs_out.append({
            "leg_index": leg.leg_index,
            "game_id": leg.game_id,
            "market": leg.market,
            "selection": leg.selection,
            "line": leg.line,
            "odds_taken": leg.odds_taken,
            "player_name": leg.player_name,
            "player_id": leg.player_id,
            "headshot_url": headshot_url(leg.player_id),
            "result_text": prop_rt if prop_rt is not None else tr["result_text"],
            "score_text": tr["score_text"],
            "won": tr["won"] if tr["won"] is not None else (prop_rt is not None),
            "team_logo_url": tr["team_logo_url"],
            "team_abbr": tr["team_abbr"],
            "is_clincher": leg.leg_index == clincher.leg_index,
        })
```

(Remove the old single-line `legs_out.append({...})` block; replace wholesale with the above. Keep `hero`, `clincher`, `media_attribution` return keys unchanged.)

- [ ] **Step 4:** run `python -m pytest tests/core/test_parlay_palace_enrich.py -v` → ALL pass (4: 3 existing unchanged + new).

- [ ] **Step 5:** commit:
```bash
git add core/parlay_palace_enrich.py tests/core/test_parlay_palace_enrich.py
git commit -m "feat(parlay-palace): per-leg final score, winner, team logos"
```

---

### Task 2 (FE): extend Palace leg types

**Files:** Modify `FE: src/lib/types.ts`. Test: `FE: tests/lib/api.parlayPalace.test.ts` (no change needed; type-only).

- [ ] **Step 1:** in `PalaceLeg`, add fields (after `result_text`):
```typescript
  score_text: string | null;
  won: boolean | null;
  team_logo_url: string | null;
  team_abbr: string | null;
```
- [ ] **Step 2:** `npx tsc --noEmit` clean.
- [ ] **Step 3:** commit:
```bash
git add src/lib/types.ts
git commit -m "feat(parlay-palace): leg score/logo/won types"
```

---

### Task 3 (FE): LegRow → scoreboard row

**Files:** Rewrite `FE: src/components/parlay-palace/LegRow.tsx`. Test: rewrite `FE: tests/components/LegRow.test.tsx`.

New row: team logo (fallback player headshot, fallback blank) · pick/selection + line · final score + green ✓ W · odds. Caller passes a sequential `position` (1-based) so numbering never skips; `is_clincher` shows an extra "clincher" tag, not a replaced number.

- [ ] **Step 1: failing test** — replace `tests/components/LegRow.test.tsx` with:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegRow } from "@/components/parlay-palace/LegRow";
import type { PalaceLeg } from "@/lib/types";

const base: PalaceLeg = {
  leg_index: 3, game_id: "777", market: "ml", selection: "Texas Rangers",
  line: null, odds_taken: -136, player_name: null, player_id: null,
  headshot_url: null, result_text: null, score_text: "TEX 5, SEA 1",
  won: true, team_logo_url: "https://www.mlbstatic.com/team-logos/140.svg",
  team_abbr: "TEX", is_clincher: true,
};

describe("LegRow", () => {
  it("renders team, score, win check, odds, sequential number + clincher tag", () => {
    render(<LegRow leg={base} position={4} />);
    expect(screen.getByText(/Texas Rangers/)).toBeInTheDocument();
    expect(screen.getByText("TEX 5, SEA 1")).toBeInTheDocument();
    expect(screen.getByText(/Leg 4/)).toBeInTheDocument();
    expect(screen.getByText(/clincher/i)).toBeInTheDocument();
    expect(screen.getByText("-136")).toBeInTheDocument();
    const logo = screen.getByRole("img");
    expect(logo).toHaveAttribute("src",
      "https://www.mlbstatic.com/team-logos/140.svg");
  });
  it("falls back to player headshot for prop legs and shows result_text", () => {
    const prop: PalaceLeg = { ...base, market: "prop", selection: "OVER",
      line: 6.5, player_name: "Gallen", team_logo_url: null, team_abbr: null,
      headshot_url: "https://midfield.mlbstatic.com/v1/people/1/spots/120",
      score_text: null, result_text: "8 K", is_clincher: false };
    render(<LegRow leg={prop} position={2} />);
    expect(screen.getByText("8 K")).toBeInTheDocument();
    expect(screen.getByText(/Leg 2/)).toBeInTheDocument();
    expect(screen.queryByText(/clincher/i)).toBeNull();
    expect(screen.getByRole("img")).toHaveAttribute("src",
      "https://midfield.mlbstatic.com/v1/people/1/spots/120");
  });
});
```

- [ ] **Step 2:** `npm run test -- tests/components/LegRow.test.tsx` → FAIL (prop `position` missing / markup mismatch).

- [ ] **Step 3:** rewrite `src/components/parlay-palace/LegRow.tsx`:

```tsx
import type { PalaceLeg } from "@/lib/types";

export function LegRow({ leg, position }: { leg: PalaceLeg; position: number }) {
  const odds =
    leg.odds_taken == null
      ? null
      : `${leg.odds_taken > 0 ? "+" : ""}${leg.odds_taken}`;
  const img = leg.team_logo_url ?? leg.headshot_url;
  const label = leg.player_name ?? leg.selection ?? "Leg";
  const sub =
    leg.player_name && leg.line != null
      ? `${leg.selection ?? ""} ${leg.line}`.trim()
      : null;
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-[var(--color-border)] last:border-b-0">
      <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden shrink-0 flex items-center justify-center">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={leg.team_abbr ?? leg.player_name ?? "leg"}
               width={40} height={40}
               className={leg.team_logo_url ? "w-7 h-7 object-contain" : "w-10 h-10 object-cover"} />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-[var(--color-text)] truncate">
          {label}
          {sub && (
            <span className="text-[var(--color-text-muted)] font-medium">
              {" "}{sub}
            </span>
          )}
        </div>
        <div className="text-[11px] mt-0.5 flex items-center gap-1.5">
          <span className="text-[var(--color-text-muted)]">Leg {position}</span>
          {leg.is_clincher && (
            <span className="text-[var(--color-pos)] font-bold uppercase tracking-wide text-[10px]">
              · clincher
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        {leg.score_text && (
          <div className="text-[12px] font-bold text-[var(--color-text-soft)] flex items-center gap-1 justify-end">
            <span>{leg.score_text}</span>
            {leg.won && <span className="text-[var(--color-pos)]">✓</span>}
          </div>
        )}
        {!leg.score_text && leg.result_text && (
          <div className="text-[12px] font-bold text-[var(--color-pos)]">
            {leg.result_text} ✓
          </div>
        )}
        {odds && (
          <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            {odds}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4:** `npm run test -- tests/components/LegRow.test.tsx` → PASS (2).

- [ ] **Step 5:** commit:
```bash
git add src/components/parlay-palace/LegRow.tsx tests/components/LegRow.test.tsx
git commit -m "feat(parlay-palace): LegRow scoreboard (logo, score, W, seq number)"
```

---

### Task 4 (FE): PayoutLadder component

**Files:** Create `FE: src/components/parlay-palace/PayoutLadder.tsx`. Test: `FE: tests/components/PayoutLadder.test.tsx`.

Pure: given legs (ordered, each with `odds_taken`) and a 1u stake, render the running cumulative return after each leg. American→decimal: `o>0 ? 1+o/100 : 1+100/|o|`. Cumulative = product of decimals × 1u.

- [ ] **Step 1: failing test** — `tests/components/PayoutLadder.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PayoutLadder } from "@/components/parlay-palace/PayoutLadder";
import type { PalaceLeg } from "@/lib/types";

const L = (i: number, odds: number): PalaceLeg => ({
  leg_index: i, game_id: null, market: "ml", selection: `T${i}`, line: null,
  odds_taken: odds, player_name: null, player_id: null, headshot_url: null,
  result_text: null, score_text: null, won: true, team_logo_url: null,
  team_abbr: null, is_clincher: false,
});

describe("PayoutLadder", () => {
  it("compounds american odds into a running unit total", () => {
    render(<PayoutLadder legs={[L(0, 100), L(1, 100)]} />);
    expect(screen.getByText("2.00u")).toBeInTheDocument();   // after leg 1
    expect(screen.getByText("4.00u")).toBeInTheDocument();   // after leg 2
  });
  it("renders nothing for empty legs", () => {
    const { container } = render(<PayoutLadder legs={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2:** `npm run test -- tests/components/PayoutLadder.test.tsx` → FAIL.

- [ ] **Step 3:** create `src/components/parlay-palace/PayoutLadder.tsx`:

```tsx
import type { PalaceLeg } from "@/lib/types";

function dec(odds: number | null): number {
  if (odds == null || odds === 0) return 1;
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

export function PayoutLadder({ legs }: { legs: PalaceLeg[] }) {
  if (legs.length === 0) return null;
  let acc = 1;
  const steps = legs.map((l, i) => {
    acc *= dec(l.odds_taken);
    return { i, label: `${acc.toFixed(2)}u` };
  });
  return (
    <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold mb-3">
        How 1u became {steps[steps.length - 1].label}
      </div>
      <div className="flex items-end gap-1.5 overflow-x-auto no-scrollbar">
        {steps.map((s) => {
          const max = parseFloat(steps[steps.length - 1].label);
          const cur = parseFloat(s.label);
          const h = Math.max(8, Math.round((cur / max) * 56));
          return (
            <div key={s.i} className="flex flex-col items-center gap-1 shrink-0">
              <div className="text-[10px] font-bold text-[var(--color-pos)] tabular-nums">
                {s.label}
              </div>
              <div
                className="w-7 rounded-sm bg-[var(--color-pos)] opacity-80"
                style={{ height: `${h}px` }}
              />
              <div className="text-[9px] text-[var(--color-text-muted)]">
                L{s.i + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4:** `npm run test -- tests/components/PayoutLadder.test.tsx` → PASS.

- [ ] **Step 5:** commit:
```bash
git add src/components/parlay-palace/PayoutLadder.tsx tests/components/PayoutLadder.test.tsx
git commit -m "feat(parlay-palace): payout ladder component"
```

---

### Task 5 (FE): motion (hero count-up + staggered leg reveal)

**Files:** Create `FE: src/components/parlay-palace/Reveal.tsx` (client). Modify `FE: src/app/globals.css` (add a fade-up keyframe IF not present). Modify `FE: src/app/parlay-palace/[slug]/page.tsx` to wrap legs + ladder.

First read `src/app/globals.css` for existing keyframes (it has `tile-expand`, `pulse`, etc.) and `package.json` for `framer-motion`. If `framer-motion` is NOT a dependency, use a CSS-only approach (do NOT add a dependency).

- [ ] **Step 1:** add to `globals.css` (only if no equivalent exists) a keyframe + utility:
```css
@keyframes pp-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.pp-rise { animation: pp-rise .45s ease-out both; }
```

- [ ] **Step 2:** create `src/components/parlay-palace/Reveal.tsx`:
```tsx
"use client";
import { type ReactNode } from "react";

/** Staggered entrance. CSS-only; no deps. */
export function Reveal({ children, index = 0 }: {
  children: ReactNode; index?: number;
}) {
  return (
    <div className="pp-rise" style={{ animationDelay: `${Math.min(index, 12) * 70}ms` }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 3:** in `src/app/parlay-palace/[slug]/page.tsx` success render, wrap each `<LegRow>` in `<Reveal index={i}>` (use the map index) and wrap `<PayoutLadder>` in `<Reveal index={legs.length}>`. Render `<PayoutLadder legs={legs} />` directly under the leg list. Pass `position={i + 1}` to each `LegRow` (sequential, fixes numbering). Keep server component; `Reveal` is the only client boundary. Import `PayoutLadder` and `Reveal`. Do not change the hero/blurb/CTA/JsonLd/try-catch/TopNav.

- [ ] **Step 4:** `npx tsc --noEmit` clean; `npm run build` succeeds; route emits.

- [ ] **Step 5:** commit:
```bash
git add src/app/globals.css src/components/parlay-palace/Reveal.tsx "src/app/parlay-palace/[slug]/page.tsx"
git commit -m "feat(parlay-palace): payout ladder + staggered reveal on detail page"
```

---

### Task 6: verify + PR

- [ ] **Step 1:** BE `python -m pytest tests/core/test_parlay_palace_enrich.py tests/core/test_parlay_palace_query.py tests/core/test_parlay_palace_recap.py -q` → all pass.
- [ ] **Step 2:** FE `npm run test` → Parlay Palace tests pass, no new regressions; `npm run build` green; `npx tsc --noEmit` clean.
- [ ] **Step 3:** confirm hotlink-only (team logos are `www.mlbstatic.com` URL strings; `next.config.ts` remotePatterns unchanged).
- [ ] **Step 4:** push both branches; open a PR per repo (base `master`) titled "Parlay Palace scoreboard: per-leg scores, logos, payout ladder, motion", cross-link them, test plan includes the manual MLB-data live check.

---

## Self-review

Spec coverage: per-leg score+W (T1,T3), team logos+color accent (T1 logo, T3 render) , payout ladder (T4,T5), motion (T5), leg-numbering fix (T3 `position` + T5 passing `i+1`). Prop legs still keep headshot+result_text (T1 overlay precedence, T3 fallback). Hotlink-only preserved (logo is a URL string; no remotePatterns change). Type contract: new `PalaceLeg` fields (T2) consumed by LegRow/PayoutLadder (T3,T4) and produced by enrich (T1) — names match (`score_text`,`won`,`team_logo_url`,`team_abbr`). No placeholders; all steps have code. Backend `won` defaults to prop-result presence so prop-only parlays still show ✓.
