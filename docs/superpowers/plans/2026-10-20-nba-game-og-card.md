# NBA Game OG Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NBA games with player props render a photo-led `/slate` OG card: the most-backed player's ESPN action still on the left two thirds, fading into a dark panel with the matchup, ML split bar, spread and total leans, prop and capper counts, and handle chips.

**Architecture:** Pure data helpers in `src/lib` (bet-label folds, panel numbers, roster matching, photo policy) each with vitest coverage; the renderer gains one `NbaStage` component and one `fetchNbaHero` pipeline that slots in next to the NFL `PlayersStage` inside the existing frame. The photo chain (two rosters, overview, image) runs under one 3.5s deadline; a miss renders the existing `Scoreboard` with the short cache.

**Tech Stack:** Next.js route handler, satori + `@resvg/resvg-js` (existing), vitest, ESPN public JSON (`site.web.api.espn.com`).

**Spec:** `docs/superpowers/specs/2026-10-20-nba-game-og-card-design.md`

## Global Constraints

- Card is 1200x630 at 1x; `?scale=2` supersamples via resvg. Never raise the crawler path to 2x.
- Palette: `#0a0a0c` base, off-white `#f7f3e9`, the two team colors through `displayTeamColor`. No glows, no text shadows, square corners (0 radius) on the NBA stage.
- Fonts: Manrope (numbers, names), JetBrains Mono (labels). No new fonts.
- Panel content ends above y=510 at 1x. Only the baseline ticker lives in the bottom 120px.
- Photos: `a.espncdn.com/photo/` stills only, published within 365 days, headline skip-list applied, 16:9 rendition preferred, fetched through the combiner at `w=1200&h=675`. `espnmedia-cdn.akamaized.net` never qualifies.
- Photo chain hard deadline 3.5s from render start. Timeout or no photo -> `Scoreboard` + `FALLBACK_CACHE`. Only `?photos=headshot` renders the cutout card, with `PRIMARY_CACHE`.
- `X_SUPPRESSED_HANDLES` (winwhenhot) counted everywhere, never named.
- No em dashes in any copy or comment.
- Bump `OG_CARD_VERSION` to `"20"` in `src/app/slate/page.tsx`.

## Review Focus

1. A prop whose player name carries an accent or an initial (`L. Dončić O7.5`, `Hartenstein 10+ REB`) must still group with the full-name rows and resolve to the right ESPN id. Test in Task 3 (`matchRosterAthlete`) and Task 2 (grouping via `groupByMarket`).
2. The spread lean prints the line as the sharps took it on that side (`DET +1.5`, never `DET -1.5` derived from the other side). Test in Task 2.
3. A game with zero ML picks, or zero spread or total picks, renders the empty states (`NO ML PICKS YET`, `NO LEAN`) rather than `NaN%` or `undefined`. Test in Task 2; visual check in Task 6.
4. A photo chain that exceeds 3.5s must not produce a headshot card by accident: the deadline resolves to `null` and the renderer takes the `Scoreboard` branch with `FALLBACK_CACHE`. Test in Task 5 (unit on `fetchNbaHero` with a stalled fetch stub).
5. An NBA game whose picks have no player prop keeps the existing `Scoreboard`; `buildJsx` must not reach `NbaStage` with a null hero. Test in Task 5.

---

### Task 1: NBA bet-label folds

**Files:**
- Create: `src/lib/nba-bet-label.ts`
- Test: `src/lib/nba-bet-label.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `export function nbaBetLabel(selection: string | null | undefined, playerName: string): string | null`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { nbaBetLabel } from "./nba-bet-label";

describe("nbaBetLabel", () => {
  it.each([
    ["Cade Cunningham TO SCORE 20+ POINTS", "Cade Cunningham", "20+ PTS"],
    ["Cade Cunningham TO RECORD 8+ ASSISTS", "Cade Cunningham", "8+ AST"],
    ["Jayson Tatum OVER 8.5 Rebounds", "Jayson Tatum", "o8.5 REB"],
    ["Chet Holmgren u8.5 Rebounds", "Chet Holmgren", "u8.5 REB"],
    ["Jalen Brunson 3+ Made Threes", "Jalen Brunson", "3+ 3PM"],
    ["Tyrese Maxey 2+ 3PM", "Tyrese Maxey", "2+ 3PM"],
    ["Payton Pritchard To Record 20+ Pts + Reb + Ast", "Payton Pritchard", "20+ PRA"],
    ["Jalen Williams 23+ PTS + REB + AST", "Jalen Williams", "23+ PRA"],
    ["Joel Embiid Over 11 Rebs+Asts", "Joel Embiid", "o11 RA"],
    ["Jayson Tatum Player To Score 3+ Points In Each Quarter", "Jayson Tatum", "3+ PTS EACH QTR"],
    ["Victor Wembanyama 2+ BLK", "Victor Wembanyama", "2+ BLK"],
    ["Ausar Thompson 2+ STL + BLK", "Ausar Thompson", "2+ STL+BLK"],
    ["Tatum 20+ PTS", "Jayson Tatum", "20+ PTS"],
    ["L. Dončić O7.5", "Luka Dončić", "o7.5"],
  ])("%s -> %s", (sel, name, want) => {
    expect(nbaBetLabel(sel, name)).toBe(want);
  });
  it("uppercases and cuts an unknown shape at 24 chars", () => {
    expect(nbaBetLabel("Jayson Tatum First Basket Scorer Of The Night Special", "Jayson Tatum")).toBe("FIRST BASKET SCORER OF T");
  });
  it("returns null for empty input", () => {
    expect(nbaBetLabel("", "Jayson Tatum")).toBeNull();
    expect(nbaBetLabel("Jayson Tatum", "Jayson Tatum")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/nba-bet-label.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `nbaBetLabel` in `src/lib/nba-bet-label.ts`**

Strip the player name the same three ways `betLabel` in `src/lib/slate-players.ts` does (full, initial+surname, surname only; reuse by exporting a `stripPlayerName(selection, playerName)` helper from `slate-players.ts` and importing it). Then strip `player to`, `to score`, `to record`, `over`/`under` -> `o`/`u` prefix on a number, then fold stat words in this order: `pts + reb + ast` / `points rebounds assists` / `PRA` -> `PRA`; `rebs?+asts?` / `rebounds+assists` -> `RA`; `stl + blk` -> `STL+BLK`; `made threes` / `3pm` / `threes` -> `3PM`; `points` -> `PTS`; `rebounds` -> `REB`; `assists` -> `AST`; `blocks` -> `BLK`; `steals` -> `STL`; `in each quarter` -> `EACH QTR`. Collapse spaces, uppercase, cut at 24 chars. Null when nothing remains.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/nba-bet-label.test.ts src/lib/slate-players.test.ts`
Expected: PASS (the existing NFL tests must still pass after the helper extraction).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nba-bet-label.ts src/lib/nba-bet-label.test.ts src/lib/slate-players.ts
git commit -m "feat: NBA bet-label folds for the game card"
```

---

### Task 2: Panel numbers from a slate game

**Files:**
- Create: `src/lib/nba-og-panel.ts`
- Test: `src/lib/nba-og-panel.test.ts`

**Interfaces:**
- Consumes: `groupByMarket(picks, away, home, "NBA")` from `src/lib/slate-groups.ts` (returns `ml.away/home`, `spread.away/home`, `total.over/under`, `players[] {key, name, picks}`); `feedsConsensusOdds`, `medianInt` from `src/lib/slate-consensus.ts`; `slateBetCount` from the renderer (move it to `src/lib/slate-bet-count.ts` and re-export from the renderer so the lib has no JSX import); `nbaBetLabel` from Task 1.
- Produces:

```ts
export interface NbaLean { side: "away" | "home" | "over" | "under"; line: number | null; count: number; of: number }
export interface NbaBackedPlayer { key: string; name: string; sharps: number; legs: number; topBet: string | null; team: "away" | "home" | null }
export interface NbaPanel {
  ml: { away: number; home: number; awayPct: number | null; homePct: number | null; favored: "away" | "home" | null; medianOdds: number | null };
  spread: NbaLean | null;
  total: NbaLean | null;
  propCount: number;
  players: NbaBackedPlayer[];   // all, sorted most-backed first
  capperCount: number;
  betCount: number;
  chips: { handles: string[]; more: number };
}
export function buildNbaPanel(game: SlateGame): NbaPanel
```

- [ ] **Step 1: Write the failing test**

Build a fixture from the 2026-10-20 BOS @ DET payload shape (a dozen rows is enough): 3 ML on BOS (one `winwhenhot`), 1 ML on DET, 2 spreads `Detroit Pistons +1.5` (line 1.5), 1 spread `Celtics -1.5` (line -1.5), 3 totals `Under 221.5` (line 221.5), 1 `Over 222.5`, 4 props on Jayson Tatum from 3 cappers (`TO SCORE 20+ POINTS` x2, `OVER 8.5 Rebounds`, `Tatum 4+ AST`), 2 props on Cade from 2 cappers, one parlay with two legs sharing `parlay_id`.

```ts
it("tallies the ML split with suppressed handles counted but unnamed", () => {
  const p = buildNbaPanel(game);
  expect(p.ml).toMatchObject({ away: 3, home: 1, awayPct: 75, homePct: 25, favored: "away" });
  expect(p.chips.handles).not.toContain("winwhenhot");
});
it("spread lean prints the line as taken on that side", () => {
  expect(buildNbaPanel(game).spread).toEqual({ side: "home", line: 1.5, count: 2, of: 3 });
});
it("total lean picks the direction with more sharps and its most common line", () => {
  expect(buildNbaPanel(game).total).toEqual({ side: "under", line: 221.5, count: 3, of: 4 });
});
it("players sort by distinct cappers and carry the most common bet", () => {
  const [tatum, cade] = buildNbaPanel(game).players;
  expect(tatum).toMatchObject({ name: "Jayson Tatum", sharps: 3, topBet: "20+ PTS" });
  expect(cade.name).toBe("Cade Cunningham");
});
it("counts bets not rows and cappers once", () => {
  const p = buildNbaPanel(game);
  expect(p.betCount).toBe(slateBetCount(game.picks));
  expect(p.capperCount).toBe(new Set(game.picks.map((x) => x.capper_id)).size);
});
it("empty markets produce null leans and null percents, never NaN", () => {
  const p = buildNbaPanel({ ...game, picks: game.picks.filter((x) => x.player_name) });
  expect(p.ml.awayPct).toBeNull();
  expect(p.ml.favored).toBeNull();
  expect(p.spread).toBeNull();
  expect(p.total).toBeNull();
});
it("groups an initial-form and a surname-only row with the full name", () => {
  // add rows "J. Tatum o5.5 Assists" and "Tatum 20+ PTS" from two new cappers
  expect(buildNbaPanel(withVariants).players[0]).toMatchObject({ name: "Jayson Tatum", sharps: 5 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/nba-og-panel.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `buildNbaPanel` in `src/lib/nba-og-panel.ts`**

Percentages are integers that sum to 100 (`Math.round` the away share, home = 100 - away). Spread line = the most common `line` among the lean side's rows, printed with its sign as stored. Total line: most common line in the lean direction; ties go lowest for under, highest for over. `topBet` = `nbaBetLabel` key with the most distinct cappers. `team` for a player = `pickTeamSide` is not available for props; leave `null` in this task (Task 3's roster lookup fills the caption's team color). Chips: distinct named handles in first-seen order from `ml[favored]`, then the other ML side, then every other pick; `handles` = first three, `more` = remaining distinct named count.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/nba-og-panel.test.ts src/lib/slate-groups.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nba-og-panel.ts src/lib/nba-og-panel.test.ts src/lib/slate-bet-count.ts src/app/slate/_slate-og-renderer.tsx
git commit -m "feat: NBA OG panel numbers from the slate payload"
```

---

### Task 3: ESPN NBA roster resolver

**Files:**
- Modify: `src/lib/nba-teams.ts` (add `NBA_ESPN_TEAM_IDS`)
- Modify: `src/lib/nba-teams.test.ts` (30-entry check)
- Create: `src/lib/espn-nba-roster.ts`
- Test: `src/lib/espn-nba-roster.test.ts`

**Interfaces:**
- Produces:

```ts
// nba-teams.ts
export const NBA_ESPN_TEAM_IDS: Record<string, number>  // ATL 1, BOS 2, BKN 17, CHA 30, CHI 4, CLE 5, DAL 6, DEN 7, DET 8, GS 9, HOU 10, IND 11, LAC 12, LAL 13, MEM 29, MIA 14, MIL 15, MIN 16, NO 3, NY 18, OKC 25, ORL 19, PHI 20, PHX 21, POR 22, SAC 23, SA 24, TOR 28, UTAH 26, WSH 27
// espn-nba-roster.ts
export interface RosterAthlete { id: number; fullName: string; lastName: string; team: string }
export function normalizePersonName(s: string): string            // lowercase, accents stripped, dots removed, Jr/Sr/II/III/IV dropped
export function matchRosterAthlete(athletes: RosterAthlete[], name: string): RosterAthlete | null
export function espnNbaRosterUrl(abbr: string): string | null     // site.web.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{id}/roster
export async function fetchNbaRoster(abbr: string, timeoutMs?: number): Promise<RosterAthlete[]>  // 6h module cache keyed by abbr
export async function resolveNbaAthlete(name: string, teams: [string | null, string | null], timeoutMs?: number): Promise<RosterAthlete | null>
```

- [ ] **Step 1: Write the failing tests**

```ts
// nba-teams.test.ts addition
it("has an ESPN team id for every NBA abbr", () => {
  expect(Object.keys(NBA_ESPN_TEAM_IDS).sort()).toEqual(Object.keys(NBA_TEAM_COLORS).sort());
  expect(NBA_ESPN_TEAM_IDS.BOS).toBe(2);
  expect(NBA_ESPN_TEAM_IDS.DET).toBe(8);
});
// espn-nba-roster.test.ts
const R: RosterAthlete[] = [
  { id: 4065648, fullName: "Jayson Tatum", lastName: "Tatum", team: "BOS" },
  { id: 4432166, fullName: "Cade Cunningham", lastName: "Cunningham", team: "DET" },
  { id: 3945274, fullName: "Luka Dončić", lastName: "Dončić", team: "LAL" },
  { id: 1, fullName: "Jaylen Brown", lastName: "Brown", team: "PHI" },
  { id: 2, fullName: "Bruce Brown", lastName: "Brown", team: "NO" },
  { id: 3, fullName: "Kelly Oubre Jr.", lastName: "Oubre Jr.", team: "IND" },
];
it("matches a full name", () => expect(matchRosterAthlete(R, "Jayson Tatum")?.id).toBe(4065648));
it("matches an accented name typed plain and an initial form", () => {
  expect(matchRosterAthlete(R, "Luka Doncic")?.id).toBe(3945274);
  expect(matchRosterAthlete(R, "L. Dončić")?.id).toBe(3945274);
});
it("matches a unique surname and refuses an ambiguous one", () => {
  expect(matchRosterAthlete(R, "Cunningham")?.id).toBe(4432166);
  expect(matchRosterAthlete(R, "Brown")).toBeNull();
  expect(matchRosterAthlete(R, "J. Brown")?.id).toBe(1);
});
it("ignores suffixes", () => expect(matchRosterAthlete(R, "Kelly Oubre")?.id).toBe(3));
it("builds the web host roster url", () => {
  expect(espnNbaRosterUrl("BOS")).toBe("https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/teams/2/roster");
  expect(espnNbaRosterUrl("XXX")).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/nba-teams.test.ts src/lib/espn-nba-roster.test.ts`
Expected: FAIL on the new cases.

- [ ] **Step 3: Implement the table and the resolver**

`fetchNbaRoster` reads `athletes[]` from the JSON (`id` is a string on the wire, coerce to number), fetches with the browser-shaped UA the overview call uses, 2500ms default timeout, returns `[]` on any failure and does not cache failures. `resolveNbaAthlete` fetches both teams in parallel, concatenates, and calls `matchRosterAthlete`. Cache: `Map<string, { at: number; athletes: RosterAthlete[] }>` at module scope, 6h TTL.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/nba-teams.test.ts src/lib/espn-nba-roster.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nba-teams.ts src/lib/nba-teams.test.ts src/lib/espn-nba-roster.ts src/lib/espn-nba-roster.test.ts
git commit -m "feat: ESPN NBA roster resolver for OG card photos"
```

---

### Task 4: NBA photo policy in `pickActionPhoto`

**Files:**
- Modify: `src/lib/espn-player-photo.ts`
- Modify: `src/lib/espn-player-photo.test.ts`

**Interfaces:**
- Produces:

```ts
export const NBA_SKIP_HEADLINE: RegExp  // /\b(trade|traded|contract|extension|opens up|calls|says|fashion|draft|forecast|rankings|odds|tips|dfs)\b/i
export interface PhotoPolicy { maxAgeDays: number; skipHeadline: RegExp | null; preferWide: boolean }
export const PHOTO_POLICY: Record<PhotoSport, PhotoPolicy>   // NFL: { Infinity, null, false }; NBA: { 365, NBA_SKIP_HEADLINE, true }
export function pickActionPhoto(overview, playerId, lastName, sport = "NFL", now: Date = new Date()): string | null   // `now` added for tests
```

- [ ] **Step 1: Write the failing tests**

Add an NBA overview fixture modelled on Tatum's real feed (2026-10-20): a 10/11 solo-tagged `espnmedia-cdn.akamaized.net` item (must lose), a 2026-04-27 `a.espncdn.com/photo/.../r1649803_600x400_3-2.jpg` plus `_1296x729_16-9.jpg` pair headlined "Tatum 'comfortable' leading new-look Celtics post-Brown trade" (skipped by `trade`), a 2026-05-14 solo-tagged "Tatum drops 38 in Game 5" with both renditions (must win, 16:9 url), and a 2024-11-02 solo-tagged action item (older than 365 days, must lose).

```ts
it("NBA: skips video thumbnails, old articles and talking-head headlines, prefers the 16:9 still", () => {
  expect(pickActionPhoto(TATUM, 4065648, "Tatum", "NBA", new Date("2026-10-20"))).toBe("https://a.espncdn.com/photo/2026/0514/r1492811_1296x729_16-9.jpg");
});
it("NBA: returns null when only skipped or stale items remain", () => { ... });
it("NFL policy is unchanged", () => { /* existing MAHOMES expectations still hold with sport omitted */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/espn-player-photo.test.ts`
Expected: FAIL on the NBA cases.

- [ ] **Step 3: Implement the policy**

Apply `PHOTO_POLICY[sport]` inside the loop: drop articles older than `maxAgeDays` (compare `published` to `now`), drop headlines matching `skipHeadline`, and when `preferWide` pick the `images[]` entry whose url contains `_16-9` before the first qualifying one. Host and `MIN_WIDTH` checks stay as they are.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/espn-player-photo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/espn-player-photo.ts src/lib/espn-player-photo.test.ts
git commit -m "feat: NBA photo policy (stills, 365 days, headline skip-list)"
```

---

### Task 5: Renderer: `fetchNbaHero` and `NbaStage`

**Files:**
- Modify: `src/app/slate/_slate-og-renderer.tsx` (`MarqueeBlock`, `renderSlateOg` lines 444-515, `buildJsx` branch at line 828, new `NbaStage` next to `PlayersStage` at line 1074)
- Create: `src/app/slate/_nba-hero.ts` (fetch pipeline, no JSX, testable)
- Test: `src/app/slate/_nba-hero.test.ts`
- Modify: `src/app/slate/page.tsx:181` (`OG_CARD_VERSION = "20"`)

**Interfaces:**
- Consumes: `buildNbaPanel` (Task 2), `resolveNbaAthlete` (Task 3), `fetchActionPhotoUrl(id, lastName, 2500, "NBA")`, `espnResizedUrl(url, 1200, 675)`, `espnHeadshotUrl(id, "NBA")` (Task 4 / existing), `withDeadline` from `src/lib/api.ts`.
- Produces:

```ts
// _nba-hero.ts
export interface NbaHero { player: NbaBackedPlayer; athleteId: number; photoDataUri: string; photoKind: "action" | "headshot"; teamSide: "away" | "home" | null }
export interface NbaHeroDeps { resolve: typeof resolveNbaAthlete; actionUrl: typeof fetchActionPhotoUrl; toDataUri: (url: string | null) => Promise<string | null> }
export async function fetchNbaHero(game: SlateGame, panel: NbaPanel, mode: PhotoMode, deps: NbaHeroDeps, deadlineMs = 3500): Promise<NbaHero | null>
// renderer
interface MarqueeBlock { ...existing; nba: { panel: NbaPanel; hero: NbaHero } | null }
```

- [ ] **Step 1: Write the failing tests for `fetchNbaHero`**

```ts
it("tries the most-backed player, then the next two, before giving up", async () => {
  // resolve returns ids for all three; actionUrl returns null for the first two, a url for the third
  expect((await fetchNbaHero(game, panel, "action", deps))?.player.name).toBe(panel.players[2].name);
});
it("falls back to the first player's headshot when no still qualifies in action mode", async () => {
  expect((await fetchNbaHero(game, panel, "action", deps))?.photoKind).toBe("headshot");
});
it("headshot mode skips the article lookup", async () => { expect(actionUrlSpy).not.toHaveBeenCalled(); });
it("returns null past the deadline", async () => {
  // resolve never settles; deadlineMs 50
  expect(await fetchNbaHero(game, panel, "action", stalledDeps, 50)).toBeNull();
});
it("returns null when the game has no props", async () => { expect(await fetchNbaHero(noProps, buildNbaPanel(noProps), "action", deps)).toBeNull(); });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/slate/_nba-hero.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `fetchNbaHero` in `src/app/slate/_nba-hero.ts`**

Wrap the whole chain in `withDeadline(..., deadlineMs, null)`. Order: for each of `panel.players.slice(0, 3)`: if any of the player's rows carries `player_id`, look that id up in the two fetched rosters and use it when found (the platform will stamp ESPN ids in phase 3; a foreign id must not reach the photo call), otherwise resolve by name across `[game.away_team, game.home_team]`; in action mode fetch the still url, resize via `espnResizedUrl(url, 1200, 675)`, `toDataUri`; first success returns `{ photoKind: "action" }`. Then the first resolved player's headshot via `toDataUri(espnHeadshotUrl(id, "NBA"))` -> `{ photoKind: "headshot" }`. `teamSide` = `"away"` / `"home"` by comparing the athlete's `team` to the game's abbrs. Null otherwise. Move `fetchRemoteImageAsDataUri` out of the renderer into `src/lib/remote-image.ts` so `_nba-hero.ts` and tests import it without JSX.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/slate/_nba-hero.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the renderer**

In `renderSlateOg`: when `featuredGame.sport === "NBA"` build `panel = buildNbaPanel(featuredGame)` and run `fetchNbaHero` in the same `Promise.all` as the team logos (`fetchPlayerTiles` stays NFL-only and returns `[]`). `marquee.nba = hero ? { panel, hero } : null`. `degraded` adds: `featuredGame.sport === "NBA" && panel.propCount > 0 && hero == null` (the photo chain missed or timed out) but NOT when `opts.photos === "headshot"` and `hero.photoKind === "headshot"`.

In `buildJsx`: branch order becomes `marquee?.nba` -> `<NbaStage marquee awayC homeC />`, then the existing `players.length > 0` -> `PlayersStage`, then `Scoreboard`. Turn the team-color arena washes and the 5px top rule off when `marquee.nba` is set (the ML bar carries the colors).

`NbaStage` lays out the spec's card inside the existing content column (the header and ticker stay): an absolutely positioned photo block `left:0 top:0 width:792 height:630` with the `<img objectFit: cover, objectPosition: "50% 25%">`, the two gradient overlays from the spec (horizontal 30/52/64 stops, vertical .35/0/0/.92), the caption tag at `left:48 bottom:140` (8px team-color square in `teamSide`'s color, name 24px/800, mono 13px `N CAPPERS · topBet`, drop `topBet` when name+bet exceeds 520px estimated at 0.56em per char), and the right panel `right:48 top:36 width:470` with the matchup row (56px logos, 44px/800 abbrs in team colors, mono 14px time), the 10px ML bar + mono 14px line (`NO ML PICKS YET` centered when `favored` is null), the 2x2 grid (mono 14px label, 30px/800 value, mono 12px sub at 55%: `SPREAD` in the lean side's color or `NO LEAN`, `TOTAL`, `PROPS` with `TATUM 30 · CADE 23` from `players[0..1]` surnames and `legs`, `CAPPERS` with `${betCount} PICKS`), and the chip row (`CHIP_BG`/`CHIP_BORDER`, square, mono 15px, `@handle` x3 + `+N`). Satori needs `display: flex` on every div; images must be data URIs.

- [ ] **Step 6: Typecheck, lint, full test run**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: all green.

- [ ] **Step 7: Bump the card version and commit**

Edit `src/app/slate/page.tsx:181` to `const OG_CARD_VERSION = "20";`.

```bash
git add src/app/slate src/lib/remote-image.ts
git commit -m "feat: NBA game OG card, action photo + info panel"
```

---

### Task 6: Render locally and look at it

**Files:**
- Create (throwaway, never committed): `D:/capwatch-web/.tmp-render-nba.mts`

- [ ] **Step 1: Write the harness**

Loads `.env.local`, imports `renderSlateOg` from `src/app/slate/_slate-og-renderer`, and for each of `BOS-DET`, `PHI-NY`, `OKC-SA` writes `.tmp-nba-<slug>.png` at scale 1 and `.tmp-nba-<slug>-2x.png` at scale 2, plus `.tmp-nba-BOS-DET-headshot.png` with `photos: "headshot"`. Also writes a 600px-wide downscale of each 1x PNG via `sharp` or `@resvg` (whichever is in `node_modules`) as `.tmp-nba-<slug>-feed.png`. Run with `npx tsx .tmp-render-nba.mts` from the repo root (Turbopack worktree junction gotcha does not apply to `tsx`).

- [ ] **Step 2: Render and open on David's screen**

Run: `npx tsx .tmp-render-nba.mts && powershell -c "Invoke-Item .tmp-nba-BOS-DET.png; Invoke-Item .tmp-nba-BOS-DET-feed.png"`
Expected: three cards with a photo, caption tag clear of the player, panel ending above y=510, nothing but the ticker in the bottom 120px. Read each PNG yourself too and check the 2x for `<img>` presence (satori drops images under transforms; this path uses resvg fitTo, which is fine).

- [ ] **Step 3: Exercise the edge states**

With a local fixture override (env `SLATE_FIXTURE=<path>` read by the harness and passed as `games` via a small exported `renderSlateOgFromGames` test seam, or by editing the fixture JSON): a game with zero ML picks, a game with zero spreads, a player name that misses the roster (forces the fall-through), a prop-less NBA game (must render `Scoreboard`). Open each.

- [ ] **Step 4: Cold-path timing**

Log the elapsed ms around `fetchNbaHero` in the harness; expect under 2.5s warm and under 3.5s cold on the first call (rosters uncached). Note the numbers in the PR.

- [ ] **Step 5: Delete the harness**

```bash
rm .tmp-render-nba.mts .tmp-nba-*.png
git status --short   # nothing from this task
```

---

### Task 7: PR, CI, Codex gate, deploy check

- [ ] **Step 1: Confirm branch hygiene**

Run: `git log origin/master..HEAD --oneline`
Expected: only this feature's commits (spec, tasks 1-5).

- [ ] **Step 2: Open the PR**

```bash
git push -u origin feat/nba-game-og-card
gh pr create --title "feat: NBA game OG card (action photo + info panel)" --body-file <body>
```

Body: what the card is, the spec path, the three render PNGs attached, cold timing, the fall-through order, and the note that `?photos=headshot` and `?scale=2` are unchanged for posters. End with the attribution line.

- [ ] **Step 3: Wait for CI and Codex**

Run: `gh pr checks --watch`
Expected: green. Read every Codex comment; verify each against the code before acting (they have been right about 8 of 8 real issues on the NBA PRs).

- [ ] **Step 4: Merge and verify prod**

After merge and the Vercel deploy succeeds: fetch `https://tailslips.com/og/slate?sport=nba&game=BOS-DET&r=1` and `&scale=2`, open both, confirm the photo card and the `cache-control` header (`PRIMARY_CACHE` on a clean render). Then `post_slate_card.py --sport nba --game BOS-DET` on the platform repo renders the native-media PNG (do not `--post` without David).

- [ ] **Step 5: Log**

Append the card version bump and the fall-through order to the EA memory file for the slate OG card, and a one-line entry in `D:/EA/projects/tailslips/backlog.md` for the phase 3 follow-up (platform stamps `player_id` on NBA props, which removes the roster round trip).
