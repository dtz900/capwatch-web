/* Ticket price for a VIP parlay. The platform stores a combined price on
 * leg 0 with the other legs unpriced (core/manual_bet.py); a ticket the
 * capper priced per leg carries a price on every leg instead. */

export function americanToDecimal(odds: number): number {
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

export function decimalToAmerican(dec: number): number {
  return dec >= 2 ? Math.round((dec - 1) * 100) : -Math.round(100 / (dec - 1));
}

/** Combined price on leg 0 -> that price. Every leg priced -> the legs
 *  multiplied. Anything else -> null (the slip follows the market). */
export function parlayTicketOdds(
  legs: ReadonlyArray<{ odds_taken: number | null; parlay_leg_index: number | null }>,
): number | null {
  if (legs.length === 0) return null;
  const lead = legs.find((l) => l.parlay_leg_index === 0) ?? legs[0];
  const combined =
    lead.odds_taken != null && legs.every((l) => l === lead || l.odds_taken == null);
  if (combined) return lead.odds_taken;
  if (legs.every((l) => l.odds_taken != null && l.odds_taken !== 0)) {
    const dec = legs.reduce((acc, l) => acc * americanToDecimal(l.odds_taken as number), 1);
    return decimalToAmerican(dec);
  }
  return null;
}
