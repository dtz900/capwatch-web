# Sportsbook logo assets

Official sportsbook logos for the affiliate CTA button (`AffiliatePicker`).

## Why these live here

BetMGM's CJ affiliate program terms state: "Publishers can only use logos
and images provided in the CJ Account Manager." A homemade brand-color
treatment is not compliant. The official asset must be exported from CJ
and self-hosted here.

## What to add for BetMGM (before going live)

1. In CJ, go to the BetMGM advertiser (6218491): **Links & Products**,
   filter **Link Type** to a logo / brand asset (not the 1080xNNN promo
   banners, not the `onelink.me` app-install creatives).
2. Export the official BetMGM Sportsbook logo. Prefer a transparent PNG
   that reads on a white chip (the button uses a white background and
   renders the logo at 14px height).
3. Save it in this folder as exactly:

   ```
   betmgm.png
   ```

   The filename must match `logo` in `src/lib/sportsbooks.ts`
   (`/sportsbooks/betmgm.png`). If you use a different extension, update
   that file to match.

Until `betmgm.png` exists, `AffiliatePicker` automatically falls back to
the text + brand-color button, so nothing breaks. Once the file is in
place and the book is enabled, the official logo renders.

## Adding DraftKings / FanDuel later

Same steps with their CJ-provided assets, saved as `draftkings.png` /
`fanduel.png`, plus uncommenting their entries in
`src/lib/sportsbooks.ts`.
