# Pick History: Inline Parlay Legs — Design Spec

**Date:** 2026-05-21
**Status:** Approved (design), pending implementation plan
**Repos:** `capwatch-web` (tailslips.com frontend), `fadeai-platform` (Railway backend / Supabase)

## Summary

The capper page Pick History today shows parlay rows as a single label ("3-leg
parlay") with no indication of which legs hit, missed, or pushed, and no way to
see the actual selections. When the source tweet is later deleted from X, the
receipt is fully invisible to a visitor even though TailSlips has parsed and
graded every leg.

This spec adds an inline glyph row on every parlay entry showing per-leg
outcomes at a glance, plus a tap-to-expand affordance that reveals each leg's
selection, odds, and game. The change applies to both the graded history table
and the live pending block, and it covers the deleted-tweet preservation case
that motivated the work.

## Goals

- See win/loss/push/pending state for every leg of a parlay without leaving the
  capper page.
- Recover the full leg list (selection text, odds, game) for any parlay,
  including parlays whose source tweet has been deleted on X.
- Keep the default density of the Pick History table: one row, scannable.
- Reuse the leg data already collected for the Parlay Palace rather than
  building a parallel pipeline.

## Non-Goals (v1)

- Per-leg action photos, scoreboards, or headshots in the inline expand. Those
  are the Parlay Palace's job and stay there.
- Combined parlay odds in the table. The Odds column stays blank for parlay
  rows. Per-leg odds appear in the expanded view.
- Animations or motion design beyond a static expand/collapse.
- Changes to the straight-pick row format. Straights already show the
  selection text on the row.
- Per-pick permalinks. Each pick stays addressable via its source tweet URL;
  no new `/cappers/<handle>/picks/<id>` routes.

## User-Facing Behavior

### Default (collapsed) row

For a parlay row, the Selection cell renders, in order:

1. The existing yellow "N-leg parlay" label.
2. A horizontal glyph row, one glyph per leg, in chronological leg order (the
   order legs were parsed from the source post, which is also how Parlay Palace
   orders them).
3. Any existing badges already shown today ("Deleted on X", "Deleted after
   first pitch").
4. A small chevron indicating the row is expandable.

Glyphs render at natural size (15px square) and are never capped, shrunk, or
hidden. The Selection column has enough horizontal room to accommodate at
least 14 glyphs plus the label and badges; long parlays simply extend further
into the column. Wrapping to a second line is an allowed last-resort fallback
if an outlier ever exceeds available width, but is not the default behavior
and should not be designed for at the expense of the natural-size first line.

The Line, Odds, Units, Profit columns and the deletion icon affordance behave
exactly as they do today on parlay rows.

### Glyph states

Four states cover every leg. Voids are folded into push.

| Glyph | State   | Visual                                                          |
| ----- | ------- | --------------------------------------------------------------- |
| W     | Win     | Green check on a subtle green tile                              |
| L     | Loss    | Red cross on a subtle red tile                                  |
| Push  | Push    | Neutral dash on a low-contrast tile                             |
| Pend  | Pending | Empty tile with a dashed outline                                |

Color tokens reuse the existing `--color-pos`, `--color-neg`, and muted
neutrals already in the design system. Tile backgrounds are tinted at the same
opacity used for the row's outcome bar.

### Expanded row

Clicking (or tapping) the parlay row body toggles the expanded state. The
existing deletion icon and source-tweet link in the rightmost cell retain
their own click targets and do not toggle the expand. The expansion appears
directly under the row, indented past the date column. It contains a
compact list, one line per leg, with:

- The same per-leg outcome glyph (left-aligned, matches the inline row).
- The leg's selection text (e.g. "Acuna over 1.5 bases").
- The leg's odds at the time of the post (right-aligned within the leg list).
- A muted game label on the far right (e.g. "ATL @ MIA").

No per-leg photos, scoreboards, or links to the Parlay Palace. The expand is a
receipt, not a brochure.

### Hover (desktop, optional polish)

On non-touch devices, hovering a glyph shows a small tooltip with the leg's
selection text. This is a quick-peek affordance that does not require
expanding the row. The tooltip is purely additive; the expand remains the
canonical way to see all legs.

### Pending parlays (live block)

The pending block at the top of the capper page already lists active parlays.
Apply the same glyph row to those entries. Already-decided legs render as W,
L, or Push; not-yet-started legs render as Pending. An adjacent muted
"X / N live" hint can summarize state ("2 / 5 live") next to the glyph row to
help scanning.

The expand behavior on pending parlays shows the leg list with whatever
outcome data is available; undecided legs show their selection text without an
outcome glyph.

### Deleted-tweet case (the motivating receipt)

A parlay where the source tweet has been deleted on X keeps both its glyph
row and its expanded leg list. The "Deleted on X" or "Deleted after first
pitch" badge remains where it sits today. This is the core value the change
unlocks: TailSlips has the legs; the page now shows them.

### Mobile

On the existing stacked mobile card layout, the glyph row sits on the title
line directly after the "N-leg parlay" label, identical to desktop. The
expand control is a tappable chevron at the bottom of the card. Tap toggles
the same compact leg list, indented inside the card.

## Data

### Frontend types (capwatch-web)

`HistoryPick` gains an optional `legs` field:

```ts
export interface HistoryPickLeg {
  leg_index: number;
  market: string | null;
  selection: string | null;          // human-readable, already formatted
  line: number | null;
  odds_taken: number | null;         // grading_odds preferred when present
  outcome: "W" | "L" | "P" | null;   // null = pending
  game_label: string | null;         // "ATL @ MIA"
}

export interface HistoryPick {
  // existing fields unchanged
  legs?: HistoryPickLeg[];           // present when kind === "parlay"
}
```

`legs` is omitted (or null) for straight picks. For parlay picks it is
populated in chronological leg order.

### Backend response (fadeai-platform)

The capper profile endpoint already returns the `history[]` array used to
render the table. It gains the matching `legs` field on parlay rows, sourced
from the same join the Parlay Palace already uses. No new endpoint and no
extra round trip from the frontend.

For pending parlays the endpoint returns the same shape, with `outcome: null`
on legs that have not graded yet.

### Performance

The history page returns 25 rows. In the worst realistic case (every row a
parlay, average 5 legs) that adds 125 small leg records to the response. This
is well within the existing payload budget and does not warrant lazy loading
per row.

## Affected Code

### Frontend

- `src/lib/types.ts` — add `HistoryPickLeg`, extend `HistoryPick`.
- `src/components/capper/HistoryTable.tsx` — render glyph row, expand
  affordance, and expanded leg list. Wire the toggle state per row (React
  local state inside `HistoryRow`).
- `src/components/capper/PendingBlock.tsx` — render glyph row and expand for
  live parlays. Reuse the same glyph primitive as the history table.
- A new small component `src/components/capper/ParlayLegGlyphs.tsx` for the
  inline glyph row and an associated `ParlayLegList.tsx` for the expanded leg
  list, both shared between PendingBlock and HistoryTable.

### Backend

- The capper profile / picks endpoint joins legs from the existing source used
  by Parlay Palace and returns them on parlay rows. Exact module path pinned
  in the implementation plan.

## Risks

- **Glyph row crowding.** If a row has both a deletion badge and a long parlay,
  the Selection cell can get visually busy. Mitigation: glyphs sit immediately
  after the label and badges sit after the glyphs, in a fixed order, so the
  eye scans label → outcome → context consistently. If the row ever overflows
  on a real example, drop glyphs to a second line under the label (no
  shrinking, no cap).
- **Backend leg join cost.** The Parlay Palace today fetches legs for one
  parlay at a time; the history endpoint will fetch legs for up to 25 parlays
  per request. The join needs to batch by parlay id rather than fan out per
  row. Implementation plan must call this out.
- **Pending-leg outcome flicker.** As legs grade, the pending block's glyph
  row updates. The page already revalidates at 60s; same revalidation covers
  this with no extra work.
- **Tooltip on touch.** The hover tooltip is desktop-only polish; mobile users
  rely on the expand. No conditional rendering needed; the tooltip naturally
  no-ops on touch.

## Out of Scope (deferred)

- Combined parlay odds (could add later as a small muted number next to the
  units column).
- Sharing a specific parlay's expanded view as its own URL.
- Animation on expand.
- Per-leg sortable history filter (e.g. "show only parlays containing a Soto
  leg").

## Open Questions

None blocking. Edge cases above all have a chosen answer.
