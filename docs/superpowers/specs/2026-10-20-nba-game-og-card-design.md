# NBA game OG card: action photo + info panel

Date: 2026-10-20. Decided with David in the brainstorm the afternoon of NBA opening night. Mockup chosen: direction B (split panel), name treatment B3 (small caption tag). Mockup source lives in the EA repo under `.superpowers/brainstorm/29867-1792520005/content/` (`nba-card-directions.html`, `nba-card-b-name-v2.html`).

## Intent

NBA games on the `/slate` OG card currently fall through to the MLB moneyline scoreboard (`renderSlateOg` treats NBA "like MLB"). Opening night showed why that is wrong for NBA: BOS @ DET drew 171 picks from 40 cappers and 137 of them were player props. The card should sell the game the way the feed sees it: a star making a play, then the matchup and the sharps' numbers.

David's words: an action shot of one of the star players from the game making a play (dunking, blocking, a three), faded into the foreground with the matchup and key details like the most picked side.

## Goals

- NBA games with player props render a photo-led card: action photo left, fading into a dark info panel right.
- Every number on the panel comes from the slate payload the card already fetches. No new platform endpoint for v1.
- Works for the three share paths today: crawler fetch at 1x, `?scale=2` native upload via `post_slate_card.py`, `?game=AWAY-HOME` featuring.
- Stays legible at feed scale (about 600px wide). The mockups were judged at that size, not at 1200.

## Non-goals

- No change to the MLB card, the NFL `PlayersStage`, or the no-props fallback.
- No live-score mode in v1. Pre-game only; a live NBA game renders the same card with the clock string the slate payload already carries in `gameTime`.
- No new fonts, no new palette. Off-white `#f7f3e9` + the two team colors, Manrope for numbers and names, JetBrains Mono for labels.

## Anti-goals (would make it a failure even if it renders)

- Text sitting on the player or the crowd. B1/B2 were rejected for exactly that; the name must never be a large headline on the photo.
- Rounded-2xl corners, glows, text shadows. Square corners like the current cards. resvg panics on large blur radii anyway (see the OG 2x memory).
- A photo of the wrong player, or a non-action photo (press conference, a dog). The NFL tile already has this failure mode; the NBA card has ONE photo so a miss is the whole card.
- Content inside the bottom ~120px. X lays its caption bar there.

## The card (1200x630)

Layout, left to right:

**Photo.** Covers the left 66% of the card, `background-size: cover`, positioned so the player's body sits in the left-center (mockup used `55% 30%`; production positions by the photo's own aspect, see "Photo cropping"). Two overlays on top of it:
- horizontal fade: transparent to 30%, `rgba(10,10,12,.55)` at 52%, `.96` at 64%, solid `#0a0a0c` from there to the right edge
- vertical: `.35` darkening at the very top (wordmark legibility), clear through the middle, `.92` by the bottom edge (caption-bar reserve)

**Top-left.** `TailSlips` wordmark (mono, 16px, 85% opacity) and an `NBA` chip (1px off-white border, mono 13px, dark fill). Same chip style as the existing cards' pills.

**Caption tag (B3).** Bottom-left, anchored 140px above the bottom edge so it clears the caption band. A single dark plate (`rgba(10,10,12,.85)`, 10px 14px padding, square) holding: an 8px team-color square, the player's full name at 24px/800, then a mono 13px line `N CAPPERS · <most common bet>`. One line. If the name plus bet would exceed about 520px at 1200 width, drop the bet and keep `N CAPPERS`.

**Panel (right 470px, 48px inset, starts 36px from top).** Vertical stack, 22px gaps:
1. Matchup row: away logo (56px) + abbr at 44px/800 on the left, tip time (mono 14px, 60% opacity) centered, abbr + home logo on the right. Logos via the existing `teamLogoUrl(team, "NBA")` data-URI path.
2. ML split bar: 10px tall, away share in away color, home share in home color, on a `#222` track. Under it a mono 14px line: `67% CELTICS ML` in the favored side's color on the favored side, `15 ML SHARPS` center, the other percent on the other side. Shares use the same ML side logic as today (`pickMlSide`, NBA aliases already in `SLUG_ABBR_ALIASES` / `NBA_EXTRA_ALIASES`). Zero ML picks: render the empty track and `NO ML PICKS YET` center, same honesty rule the scoreboard uses.
3. 1px rule, then a 2x2 grid, each cell = mono 14px label, 30px/800 value, mono 12px sub-line at 55%:
   - SPREAD: the side more sharps took, with its line, in that team's color; sub `5 OF 8 SHARPS`. No spread picks: `NO LEAN` and sub `0 SHARPS`.
   - TOTAL: `UNDER 221.5` / `OVER 221.5`; sub `8 OF 11 SHARPS`. Line printed = the most common line among that direction's picks (ties: lowest for under, highest for over). No total picks: `NO LEAN`.
   - PROPS: count of player-prop picks; sub = top two players by capper count as `TATUM 30 · CADE 23` (surname upper, pick counts).
   - CAPPERS: distinct cappers on the game; sub `171 PICKS` (`slateBetCount`).
4. Handle chips: up to three named handles from the ML favored side (falls back to any side, then any pick), then a `+N` chip for the rest of the distinct named cappers. winwhenhot suppression stays (`X_SUPPRESSED_HANDLES`: counted, never named).

The panel must finish above y=510. The grid is the only row allowed to compress (drop sub-lines first) if a long team name or `NO LEAN` state pushes it.

## Data rules

**Which game.** Unchanged: `?game=` wins, else `pickMarqueeGame` (most-bet scheduled game). An NBA game whose picks include no player prop renders the existing `Scoreboard`, same as a prop-less NFL game.

**Which player.** The player with the most distinct cappers on him among the game's player-prop picks. Ties: more picks, then earlier first post. This is "most backed", not "biggest star"; David accepted that in the playback. The caption's bet is his most common bet via `betLabel`, which needs NBA folds added: `TO SCORE 20+ POINTS` -> `20+ PTS`, `TO RECORD 8+ ASSISTS` -> `8+ AST`, `O/U 8.5 Rebounds` -> `o8.5 REB`, `3+ Made Threes` -> `3+ 3PM`, `Pts + Reb + Ast` -> `PRA`, `Player To Score 3+ Points In Each Quarter` -> `3+ PTS EACH QTR`. Unknown shapes print the trimmed selection, uppercased, cut at 24 chars.

**Player identity.** NBA slate picks carry `player_id: null` (parser phase 2 holds NBA props off the MLB resolver; phase 3 rosters are not built). Today's `topBackedPlayers` and `propCount` both key on `player_id`, so on NBA they return nothing. For this card:
- group NBA props by normalized name (strip accents, `.`, suffixes; the longest spelling wins for display, same rule as `displayName`). Initial-plus-surname forms (`J. Tatum`, `Tatum`) join a full-name group when exactly one group's surname matches.
- resolve the chosen player to an ESPN athlete id by fetching the two teams' ESPN rosters (`site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{espnTeamId}/roster`; ESPN team ids need a small NBA abbr -> id table, 30 rows, in `nba-teams.ts`). Match full name first, then unique surname across the two rosters. Cache rosters in-process for 6 hours (they change on trades, not minutes).
- when the platform starts stamping `player_id` on NBA props, prefer it and skip the roster call. Keep that branch in from day one so the roster lookup is a fallback, not the design.

**Photo.** `fetchActionPhotoUrl(id, lastName, 2500, "NBA")` already supports the NBA path (`ESPN_PATH.NBA`). Tag ranking stays as is (solo-tagged and named, then <=3 tags and named, then solo-tagged; league tag must be NBA). The NBA pool is different from NFL and the selector changes for it:
- Stills only: `a.espncdn.com/photo/` images, as today. Video-frame thumbnails on `espnmedia-cdn.akamaized.net` stay excluded (David, 2026-10-20, after seeing the Tatum dunk frame at native pixels: broadcast capture, soft, face behind the ball; it does not read as a photo). The card does not need a dunk, it needs a solid game-action photo.
- Recency: published within the last 365 days, newest wins within a tier. Early season this reaches last spring's playoff photos, which are real game action.
- Skip the talking-head stories by headline: an article whose headline contains any of `trade`, `traded`, `contract`, `extension`, `opens up`, `calls`, `says`, `fashion`, `draft`, `forecast`, `rankings`, `odds`, `tips`, `DFS` is dropped before ranking. Keep the list in one exported constant with a unit test; it will grow.
- Prefer the 16:9 rendition when the article offers several (`r…_1296x729_16-9.jpg` over `600x400_3-2`). Request through the combiner at `w=1200&h=675`, not the 704 the tiles use.
- A photo is "solid" if it clears the above; there is no attempt to detect dunks or shot type. `?photos=headshot` remains the escape hatch when the editorial pick misses.
- Fall-through order when the most-backed player has no qualifying photo: second most-backed player, then third; then the most-backed player's headshot cutout; then `Scoreboard`. Never a blank photo area.
- `?photos=headshot` keeps working: the cutout (`espnHeadshotUrl(id, "NBA")`) sits right-aligned inside the photo area on a team-color wash at 0.34, the existing arena-wash alpha.

**Roster endpoint.** `site.api.espn.com/.../teams/{id}/roster` returns 403 to the repo's user agents (reviewer check 2026-10-20). Use the same path on `site.web.api.espn.com`, the host the overview call already uses; it returns 200 with `athletes[].id`, `fullName`, `lastName`.

**`player_id` on NBA props.** When the platform stamps it (phase 3 rosters), it will be the ESPN athlete id, the same source `nba_games` and the NFL roster gate use. Still validate it against the two-team roster cache before trusting it: a foreign id would render the wrong player silently. Validation miss falls back to the name resolver.

**Time budget.** The photo chain is serial (rosters, overview, image) and cannot overlap itself; it overlaps the logo fetches. Hard deadline for the whole chain: 3.5s from render start, measured against the Twitterbot budget noted at the top of the renderer. Past the deadline the card renders `Scoreboard` (not a headshot: a headshot card produced by a timeout would look intentional) and takes `FALLBACK_CACHE` so the next crawl heals it. Only `?photos=headshot` produces the headshot card on purpose, with `PRIMARY_CACHE`.

**Shared chrome.** The NBA stage slots into `buildJsx` next to `PlayersStage` and keeps the shared frame: the PNG wordmark (not the mono text the mockup used), the pre-game pill with the live dot, the FEATURED GAME / MOST-BET GAME label, and the baseline ticker carrying `tailslips.com`. The ticker lives in the caption band on purpose and is the one sacrificial row; "no content in the bottom 120px" applies to everything else. The 5px split team-color rule stays off on this stage; the ML bar carries the two colors.

**Photo cropping.** ESPN stills are 16:9; the photo area is roughly 792x630 (1.26:1). With `cover` the crop takes the center ~70% width of the still. Position `50% 25%` by default (faces sit in the upper third of game action photos). The caption tag covers the bottom-left corner, so a subject there is acceptable.

## Versioning and caches

- Bump `OG_CARD_VERSION` in `src/app/slate/page.tsx` (crawler image URL key). X caches per page URL; a re-share of the same `/slate?sport=nba&game=` needs a throwaway `&r=` param, as today.
- `post_slate_card.py --sport nba --game BOS-DET [--photos headshot]` must work unchanged on the platform side; the web route already accepts `sport=nba`.

## Verification before merge

- Local render harness (`render-local.mts`, throwaway, never committed) for BOS @ DET, PHI @ NY, OKC @ SA from the 2026-10-20 slate; view each at 1:1 AND downscaled to 600px wide. Open the PNGs on David's screen (`Invoke-Item`), do not just Read them.
- A game with zero ML picks, a game with zero spreads, a player whose roster lookup misses (forces headshot/fallback), `?photos=headshot`, `?scale=2`.
- Cold render under the crawler budget: the roster calls (2) and overview (1) and image (1) must fit the same ~2.5s timeout discipline the NFL tiles use; run them in parallel with the logo fetches.
- Unit tests: NBA `betLabel` folds, name grouping (accent and initial cases), roster matching (full, unique surname, ambiguous surname -> null), photo preference for stills over video frames, the panel's lean computations (spread side, total direction + line) on the opening-night fixtures.

## Left to the builder

- Exact font sizes may move a few px to fit the 470px panel; the hierarchy (abbr > value > label) does not.
- Whether the roster cache lives in the module or in `unstable_cache`.
- Where the NBA bet-label folds live (extend `betLabel` with a sport argument, or a sibling `betLabelNba`).

## Calls I made (David can overrule)

- Most-backed player picks the photo, not a star list.
- Pre-game only in v1; live games reuse the card with the clock.
- Stills only, video frames never (David's call after seeing one).
- 365-day window and the headline skip-list are mine; widen or trim as misses show up.
- No-props NBA games keep the scoreboard rather than a photo of the ML favorite's best player.
- Chips come from the ML favored side first.
