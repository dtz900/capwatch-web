/**
 * Rewrite an ungradeable pick's selection to a grader-resolvable form once
 * the admin has chosen a side.
 *
 * The v2 grader derives the team a bet is on from normalize_team(selection).
 * When the capper's team token is ambiguous ("Sox ML": Red Sox or White
 * Sox?) the grade lands ungradeable even though the game is bound. Swapping
 * the ambiguous team token(s) for the chosen abbreviation ("BOS ML") makes
 * the pick gradeable on the next grader pass while keeping the market tail
 * ("ML", "-1.5", "U8.5") intact.
 */

// First token of the market tail: everything from here on is kept verbatim.
// Covers ML/moneyline, signed spreads (-1.5, +130), over/under (O8.5, U 9.5,
// Over/Under), run line, F5/1H splits, and team totals.
const MARKET_TAIL =
  /^(ml$|moneyline|[+-]?\d|[ou]\d|[ou]$|over|under|rl$|f5|1h|tt\b)/i;

export function sideSelection(original: string | null, abbr: string): string {
  const tokens = (original ?? "").trim().split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < tokens.length && !MARKET_TAIL.test(tokens[i])) i++;
  return [abbr, ...tokens.slice(i)].join(" ");
}
