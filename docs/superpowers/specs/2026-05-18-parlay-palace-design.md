# Parlay Palace — Design Spec

**Date:** 2026-05-18
**Status:** Approved (design), pending implementation plan
**Repos:** `capwatch-web` (tailslips.com frontend), `fadeai-platform` (Railway backend / Supabase)

## Summary

A curated hall-of-fame on tailslips.com that showcases every big winning MLB
parlay hit this year. Each featured parlay gets a media-rich detail page built
around a dramatic action shot of the player who clinched it. The collection is
a brandable, SEO-compounding destination and a screenshot grid built to travel
on X. The X share image (OG card) is the primary virality lever; the page backs
it up.

## Goals

- A standout visual artifact per featured parlay (action photo / highlight clip
  of the clincher), not a stat table.
- SEO archive: an indexable permalink per parlay plus a gallery index that
  ranks for long-tail queries (capper handles, player names, "biggest MLB
  parlay", "strikeout parlay that hit").
- Editorial quality bar enforced structurally: nothing weak ever publishes.
- Platform-ready content model so other post types can be added later with no
  rework.

## Non-Goals (v1)

- Non-MLB sports.
- Non-parlay wins (single straights are never eligible).
- Auto-posting to X (David posts manually per the existing @tailslips workflow).
- Other content/post types (the data model supports them; we do not build them).
- Comments, RSS.

## Selection

- Eligible: a pick that is a **parlay** with **2+ legs**, **MLB**, from **any
  tracked capper** (FADE AI is just one capper among many), graded as a **full
  win** (every leg ✓).
- No automatic units/odds/legs threshold. The system continuously collects all
  qualifying winning parlays into an **admin candidate queue**, sorted by units
  profit descending.
- **Pure admin discretion** decides what is Palace-worthy. The day's biggest
  winning parlay is surfaced as a candidate, not auto-published.

## Curation → Publish Flow

1. After grading completes, a job collects qualifying winning parlays and
   upserts them as **candidate** entries (status not yet `published`).
2. Admin opens the candidate queue (fits the existing `admin/review` pattern),
   reviews entries sorted by units.
3. On selecting a candidate, the system **enriches** it: resolves each leg's
   game to an MLB `gamePk`, pulls box-score results per leg (e.g. "8 K"),
   fetches MLB game-content imagery (action photo and/or highlight clip),
   generates an LLM recap blurb.
4. Admin reviews/edits imagery and blurb, picks the hero asset.
5. Admin clicks **Publish**. Only then is the entry public and in the sitemap.
6. If a parlay cannot get a striking hero asset (real action photo or clip),
   the admin does not publish it. The quality bar lives in the gate, not in a
   fallback.

## Imagery (the make-or-break)

- Source: **MLB's free game-content API**, keyed by game (`gamePk`). This is
  genuine MLB editorial action photography and highlight video, not studio
  headshots. Exact endpoints to be pinned in the implementation plan; this is a
  known, real source.
- Per-asset priority: MLB game-action photo → MLB highlight clip → clean
  headshot.
- **Hero must be a real action photo or clip.** Clean headshots are allowed
  only in the small per-leg list. No striking hero asset → no publish.
- Highlight clip embed appears only when MLB has one for that game; otherwise
  omitted entirely (no empty slot).

## Post Template (approved via mockup)

Single-column, mobile-shaped detail page:

1. **Hero:** full-bleed action photo (or clip) of the **clincher** — the last
   leg by game start time, framed "who sealed it" — with the receipt overlaid:
   `+units`, leg count, combined odds, capper handle, slate date. The
   longest-odds leg is shown as a supporting chip.
2. **Recap blurb:** LLM-generated, 2-3 sentences, plain narrative. No em dashes
   or double hyphens (constraint must be in the system prompt so it survives
   into model output).
3. **Leg-by-leg list:** each leg shows player photo/headshot, pick, line, odds,
   game matchup, and result (e.g. "8 K ✓"). The clinching leg is visually
   distinguished.
4. **Capper block + CTA:** capper avatar/handle and a "See @handle on TailSlips"
   link to their profile.

## Public Surface

- `/parlay-palace` — gallery index of all published parlays for the current
  year. Sortable/filterable (size, capper, recency). Year-scoped.
- `/parlay-palace/[slug]` — detail page using the template above.
- Per-entry **OG image** route using the same hero asset (reuse the existing OG
  renderer pattern in `src/app/cappers/[handle]/og` / `src/app/slate`). This is
  the primary virality lever.
- `sitemap.ts` includes published entries; Article JSON-LD via the existing
  `JsonLd` component / `lib/jsonld.ts`.

## Architecture

### Data model (platform-ready)

A generic content-entry model so future post types drop in with zero rework:

- `id`, `slug`, `type` (today only `"parlay_palace"`), `title`,
  `status` (`candidate` | `draft` | `published`), `body` (structured blocks),
  `seo` (meta title/description/OG asset ref), `published_at`,
  `created_at`/`updated_at`.
- Parlay-specific payload (within `body` or a typed sidecar): source
  `parlay_id`, capper ref, combined odds, units profit, slate date, ordered
  legs (each: selection, market, line, odds, `parlay_leg_index`, game ref,
  resolved `gamePk`, box-score result, imagery refs), hero asset ref, blurb.

Note: backend already exposes `parlay_id` and `parlay_leg_index` on pick rows
(`capwatch-web/src/lib/api.ts`), so legs are reconstructable.

### Backend (`fadeai-platform` / Supabase)

- Endpoint: compute qualifying winning-parlay candidates with ordered legs,
  sorted by units.
- Enrichment: resolve each leg's game → MLB `gamePk`; fetch box-score result
  per leg; fetch MLB game-content imagery (photo/clip).
- Recap blurb generation (LLM; em-dash/double-hyphen prohibition in the system
  prompt).
- Persist candidate/draft entries; expose admin actions (enrich, set hero,
  publish, unpublish).

### Frontend (`capwatch-web` / Next.js)

- `/parlay-palace` gallery index (paginated, SEO meta, sort/filter).
- `/parlay-palace/[slug]` detail page (approved template).
- Per-entry OG image route (reuse existing OG renderer pattern).
- `sitemap.ts` + Article JSON-LD for published entries.
- Admin curation UI: candidate queue, enrich/preview, edit blurb, pick hero,
  publish/unpublish (fits existing `admin/review` + `admin/audit` patterns).
- Heed the repo's Next.js guard (`AGENTS.md`): consult
  `node_modules/next/dist/docs/` before writing route/rendering code.

## SEO Integrity Note

One curated, data-rich, admin-approved entry with a written recap is
legitimate content. Thousands of thin, templated, auto-spun pages are scaled
content abuse under Google's spam policy. The admin-curation gate and the
action-shot quality bar are what keep Parlay Palace on the right side of that
line and must not be removed for "more pages."

## Open Items for the Plan Phase

- Pin exact MLB game-content API endpoints for action photos and highlight
  video, and the `gamePk` resolution path from a TailSlips game reference.
- Confirm licensing/attribution requirements for MLB game-content media.
- Decide blog/content storage: Supabase table(s) vs. existing backend store.
- LLM provider/model for the recap blurb and prompt.
