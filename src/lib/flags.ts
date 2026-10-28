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

/* Tail or Fade, the daily swipe game on the landing page. Needs accounts
   (vipEnabled) because a play is a row under the user's id. Off by default;
   David flips it after a full local run (decisions/log.md 2026-09-22). */
export function tofEnabled(): boolean {
  return vipEnabled() && process.env.NEXT_PUBLIC_TOF_ENABLED === "true";
}

/* Verify with X: identity linking on an existing email account. Dark until
   the Twitter provider and manual linking are configured on the Supabase
   project (spec 2026-09-23-tailslips-x-verification-design.md). */
export function xAuthEnabled(): boolean {
  return vipEnabled() && process.env.NEXT_PUBLIC_X_AUTH_ENABLED === "true";
}

/* Capper VIP: cappers sell locked picks, subscribers unlock them. Needs
   accounts (vipEnabled) because every call carries the user's token. Dark
   until launch (decisions/log.md 2026-10-27). */
export function capperVipEnabled(): boolean {
  return vipEnabled() && process.env.NEXT_PUBLIC_CAPPER_VIP_ENABLED === "true";
}
