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

/* Capper VIP preview: with the launch flag off, VIP renders only for the
   cappers named here (comma separated handles, any case), so the whole flow
   can run on production against a hidden test capper while every real
   capper's profile stays exactly as it is today (David, 2026-10-29). */
export function capperVipPreviewHandles(): string[] {
  if (!vipEnabled()) return [];
  return (process.env.NEXT_PUBLIC_CAPPER_VIP_PREVIEW_HANDLES ?? "")
    .split(",")
    .map((h) => h.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);
}

/** VIP surfaces for one capper: on at launch, or in preview for a listed capper. */
export function capperVipEnabledFor(handle: string | null | undefined): boolean {
  if (capperVipEnabled()) return true;
  return !!handle && capperVipPreviewHandles().includes(handle.toLowerCase());
}

/** Unlisted pages a preview needs (the rules page the VIP card links to).
 *  Global entry points like the footer link stay on capperVipEnabled(). */
export function capperVipReachable(): boolean {
  return capperVipEnabled() || capperVipPreviewHandles().length > 0;
}
