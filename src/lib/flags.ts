export function vipEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VIP_ENABLED === "true";
}

/* Second stage: the PAID tier. vipEnabled() launches accounts + My Tails as a
   free product; this flag keeps every paid surface (upsells, VIP badges,
   dossier, Stripe entry points) dark until the VIP launch (target: NBA edge
   maturity, see decisions/log.md 2026-07-11). */
export function vipTierEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VIP_TIER_ENABLED === "true";
}
