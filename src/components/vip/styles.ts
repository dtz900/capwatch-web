/* Shared class strings for the VIP surfaces. House style (StatBand,
 * PodiumCard): off-white is the only light color, pos/neg are the only
 * strong colors, inner cards are a thin border over a 2% white wash. */

export const EYEBROW =
  "text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold";

export const SECTION =
  "rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-6 sm:px-7 sm:py-7";

export const INNER_CARD =
  "rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-3";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg text-[11px] font-extrabold uppercase tracking-[0.12em] transition disabled:opacity-40 disabled:cursor-not-allowed";

/** Solid off-white primary (Subscribe, Start selling, Post, Save). */
export const PRIMARY_BTN = `${BTN_BASE} h-10 px-5 bg-[var(--color-text)] text-[#0f0f14] hover:opacity-90`;

/** Bordered secondary (Change, Cancel, Load games, Add leg). */
export const SECONDARY_BTN = `${BTN_BASE} h-10 px-4 border border-[var(--color-border-h)] text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.04)]`;

/** Compact bordered secondary for inline rows. */
export const SECONDARY_BTN_SM = `${BTN_BASE} h-8 px-3 border border-[var(--color-border-h)] text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.04)]`;

const CHIP_BASE =
  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] whitespace-nowrap";

export const CHIP_POS = `${CHIP_BASE} border border-transparent bg-[var(--color-pos-soft)] text-[var(--color-pos)]`;

export const CHIP_MUTED = `${CHIP_BASE} border border-[var(--color-border)] text-[var(--color-text-muted)]`;

/** Door-slot chip, sized to sit beside the h-10 buttons. */
export const DOOR_CHIP_MUTED =
  "inline-flex h-10 items-center rounded-lg px-4 border border-[var(--color-border)] text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-muted)]";

export const DOOR_CHIP_SUBSCRIBED =
  "inline-flex h-10 items-center rounded-lg px-4 border border-[var(--color-border-h)] text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text)]";

export const ERROR_TEXT = "text-[11px] text-[var(--color-neg)] font-semibold";
export const OK_TEXT = "text-[11px] text-[var(--color-pos)] font-semibold";

/* ---------- VIP brand: dark purple glass ----------
 * One surface, no banner. A deep purple tint that fades into the page
 * ground, a lavender hairline border, a 1px inner top highlight and a
 * soft sheen at the top-left corner. No glow, no neon. Numbers on these
 * surfaces are off-white or muted, never pos/neg. */

export const VIP_GLASS =
  "relative overflow-hidden rounded-xl border border-[rgba(196,181,253,0.14)] bg-[linear-gradient(150deg,rgba(91,33,182,0.48)_0%,rgba(58,24,112,0.50)_50%,rgba(30,16,56,0.72)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl";

/** Absolutely positioned sheen layer; put first inside a VIP_GLASS box. */
export const VIP_GLASS_SHEEN =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_12%_0%,rgba(167,139,250,0.20),transparent_60%)]";

export const VIP_GLASS_DIVIDER = "border-t border-[rgba(255,255,255,0.08)]";

/** Lavender wordmark, text only. */
export const VIP_WORDMARK =
  "text-[11px] font-extrabold tracking-[0.26em] text-[var(--color-vip-text)]";

/** Small purple VIP chip for headers on dark ground. */
export const VIP_CHIP =
  "inline-flex items-center rounded-md px-2 py-0.5 bg-[var(--color-vip-soft)] text-[var(--color-vip-text)] text-[10px] font-extrabold tracking-[0.18em]";

export const CHIP_VIP = `${CHIP_BASE} border border-transparent bg-[var(--color-vip-soft)] text-[var(--color-vip-text)]`;

/** VIP primary action (Subscribe, Start selling): solid off-white with
 *  deep purple text, the strongest thing on the glass. */
export const VIP_PRIMARY_BTN = `${BTN_BASE} h-10 px-6 bg-[var(--color-text)] text-[var(--color-vip-deep)] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset] hover:opacity-90`;

/** Glass chip at button height (Subscribed). */
export const VIP_GLASS_CHIP =
  "inline-flex h-10 items-center rounded-lg px-4 border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text)]";
