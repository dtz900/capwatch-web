"use client";

import { useContext } from "react";
import { createPortal } from "react-dom";
import { VipCrown } from "@/components/vip/VipCrown";
import { VIP_GLASS, VIP_GLASS_SHEEN, VIP_PRIMARY_BTN, VIP_WORDMARK } from "@/components/vip/styles";
import { dayLabel, timeLabel } from "./adapt";
import { OTHER_BOOK, bookName } from "./books";
import { fmtPrice, parsePrice, toDecimal } from "./odds";
import { betterThanBest, combinedPrice, isSgp, legPrice, legSports, quoteAt, type SlipLeg } from "./slip";
import { BookCtx, FmtCtx, LegLogo } from "./ui";

export interface SlipTotals {
  allPriced: boolean;
  unitsOk: boolean;
  isParlay: boolean;
  sameGame: boolean;
  multiSport: boolean;
  sports: string[];
  combined: number | null;
  toWin: number | null;
}

export function slipTotals(legs: SlipLeg[], units: string, sgpPrice: string): SlipTotals {
  const allPriced = legs.length > 0 && legs.every((l) => legPrice(l) !== null);
  const unitsN = Number(units);
  const unitsOk = units.trim() !== "" && unitsN >= 0.1 && unitsN <= 10;
  const sameGame = isSgp(legs);
  const sports = legSports(legs);
  // A same game parlay is priced by the book, not by multiplying legs.
  const combined = sameGame ? parsePrice(sgpPrice) : combinedPrice(legs);
  return {
    allPriced, unitsOk, sameGame, sports, combined,
    isParlay: legs.length > 1,
    multiSport: sports.length > 1,
    toWin: combined !== null && unitsOk ? unitsN * (toDecimal(combined) - 1) : null,
  };
}

/** "Tonight 7:00 PM" for a leg's game. */
export function legWhen(leg: SlipLeg, now: Date = new Date()): string {
  const t = leg.game.commence_time ? Date.parse(leg.game.commence_time) : NaN;
  return Number.isNaN(t) ? "" : `${dayLabel(t, now)} ${timeLabel(t)}`;
}

function SlipLegRow({
  leg,
  onPrice,
  onRemove,
  showSport = false,
}: {
  leg: SlipLeg;
  onPrice: (v: string) => void;
  onRemove: () => void;
  showSport?: boolean;
}) {
  const fmt = useContext(FmtCtx);
  const book = useContext(BookCtx);
  const price = legPrice(leg);
  const best = leg.manual ? null : betterThanBest(leg);
  const where = leg.manual
    ? "Checked before it counts"
    : book !== OTHER_BOOK && quoteAt(leg.side, book) === null
      ? `Not at ${bookName(book)}, market price`
      : null;
  return (
    <div className="flex flex-col gap-2 py-3.5 border-t border-[rgba(255,255,255,0.08)] first:border-t-0">
      <div className="flex items-center gap-3">
        <LegLogo leg={leg} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold leading-tight tracking-[-0.01em] text-[var(--color-text)]">{leg.side.label}</div>
          <div className="mt-0.5 text-[11px] text-[rgba(247,243,233,0.55)] truncate">
            {showSport && <span className="font-bold text-[var(--color-vip-text)]">{leg.game.sport} · </span>}
            {legWhen(leg)}
            {where && <span className="text-[var(--color-vip-text)]"> · {where}</span>}
          </div>
        </div>
        <input
          aria-label={`Price for ${leg.side.label}`}
          inputMode="decimal"
          value={leg.price}
          onChange={(e) => onPrice(e.target.value)}
          className="w-[72px] h-10 px-2 text-center text-[14px] font-extrabold tabular-nums rounded-lg bg-[rgba(0,0,0,0.28)] border border-[rgba(255,255,255,0.10)] text-[var(--color-text)] focus:outline-none focus:border-[rgba(196,181,253,0.6)]"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${leg.side.label}`}
          className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[rgba(247,243,233,0.5)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.08)] transition-colors"
        >
          <svg aria-hidden="true" viewBox="0 0 12 12" className="w-2.5 h-2.5">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {price === null && (
        <span className="pl-12 text-[11px] text-[rgba(247,243,233,0.7)]">Enter a price like -110, +150, 1.91 or 2.50.</span>
      )}
      {best !== null && (
        <span className="pl-12 text-[11px] text-[rgba(247,243,233,0.7)]">
          Better than every book we track. Your record counts it at {fmtPrice(best, fmt)}.
        </span>
      )}
    </div>
  );
}

function UnitsStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const n = Number(value);
  const step = (d: number) => {
    const base = Number.isFinite(n) ? n : 1;
    const next = Math.min(10, Math.max(0.5, Math.round((base + d) * 2) / 2));
    onChange(String(next));
  };
  const btn =
    "h-10 w-9 flex items-center justify-center text-[16px] font-bold text-[rgba(247,243,233,0.7)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.06)] transition-colors";
  return (
    <div className="inline-flex items-center rounded-lg border border-[rgba(255,255,255,0.10)] bg-[rgba(0,0,0,0.28)] overflow-hidden">
      <button type="button" aria-label="Fewer units" className={btn} onClick={() => step(-0.5)}>
        −
      </button>
      <input
        aria-label="Units"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-10 text-center text-[15px] font-extrabold tabular-nums bg-transparent text-[var(--color-text)] focus:outline-none"
      />
      <button type="button" aria-label="More units" className={btn} onClick={() => step(0.5)}>
        +
      </button>
    </div>
  );
}

/** Collapsed slip below lg: a tab pinned to the right edge with the leg
 *  count and price. Tapping it slides the slip in from the right. */
function SlipRibbon({ count, price, onOpen }: { count: number; price: string | null; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open your slip, ${count} ${count === 1 ? "pick" : "legs"}`}
      className="fixed right-0 top-[42%] z-[55] flex w-[52px] flex-col items-center gap-1.5 rounded-l-2xl border border-r-0 border-[rgba(196,181,253,0.35)] bg-[linear-gradient(160deg,#6d28d9_0%,#4c1d95_100%)] py-3 shadow-[-8px_0_24px_rgba(0,0,0,0.55)]"
    >
      <VipCrown className="w-5 h-5" />
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--color-text)] px-1.5 text-[12px] font-extrabold tabular-nums text-[var(--color-vip-deep)]">
        {count}
      </span>
      {price && <span className="text-[11px] font-extrabold tabular-nums text-[var(--color-text)]">{price}</span>}
      <span aria-hidden="true" className="text-[14px] leading-none text-[var(--color-vip-text)]">&lsaquo;</span>
    </button>
  );
}

export interface SlipProps {
  legs: SlipLeg[];
  totals: SlipTotals;
  units: string;
  onUnits: (v: string) => void;
  sgpPrice: string;
  onSgpPrice: (v: string) => void;
  onPrice: (i: number, v: string) => void;
  onRemove: (i: number) => void;
  onClear: () => void;
  onReview: () => void;
  fixing: boolean;
  /** Leave the fix; the posted ticket stands. */
  onCancelFix: () => void;
  /** null before mount; false below lg, where the slip is a drawer. */
  isLg: boolean | null;
  open: boolean;
  onOpen: (open: boolean) => void;
}

export function Slip(p: SlipProps) {
  const fmt = useContext(FmtCtx);
  const book = useContext(BookCtx);
  const { legs, totals: t } = p;
  const drawer = p.isLg === false && legs.length > 0;
  const card = (
    <div
      role={drawer ? "dialog" : undefined}
      aria-label={drawer ? "Your slip" : undefined}
      aria-hidden={drawer && !p.open ? true : undefined}
      // VIP_GLASS sets position: relative; the drawer overrides it inline.
      style={drawer ? { position: "fixed" } : undefined}
      className={`${VIP_GLASS} flex flex-col ${
        drawer
          ? `inset-y-0 right-0 z-[60] w-[min(88vw,380px)] rounded-none rounded-l-2xl shadow-[-16px_0_40px_rgba(0,0,0,0.6)] transition-transform duration-200 ease-out ${
              p.open ? "translate-x-0" : "translate-x-full"
            }`
          : ""
      }`}
    >
      <div aria-hidden="true" className={VIP_GLASS_SHEEN} />
      <div className={`relative flex flex-col px-4 pt-3.5 pb-4 ${drawer ? "h-full overflow-y-auto pt-[max(14px,env(safe-area-inset-top))]" : ""}`}>
        <div className="flex items-center gap-2 pb-1">
          <VipCrown className="w-4 h-4" />
          <span className={VIP_WORDMARK}>
            {t.isParlay
              ? `${t.multiSport ? "MULTI-SPORT PARLAY" : t.sameGame ? "SAME GAME PARLAY" : "PARLAY"} · ${legs.length}`
              : "VIP PICK"}
          </span>
          {legs.length > 0 && (
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={p.onClear}
                className="text-[11px] font-semibold text-[rgba(247,243,233,0.55)] hover:text-[var(--color-text)]"
              >
                Clear
              </button>
              {drawer && (
                <button
                  type="button"
                  onClick={() => p.onOpen(false)}
                  aria-label="Close slip"
                  className="h-8 w-8 rounded-lg text-[16px] text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.08)]"
                >
                  &rsaquo;
                </button>
              )}
            </div>
          )}
        </div>
        {p.fixing && (
          <p className="pb-1 text-[11px] text-[rgba(247,243,233,0.7)]">
            Fixing your posted pick. Subscribers see the original next to the change and get a new alert.
          </p>
        )}
        <div className="flex flex-col">
          {legs.length === 0 && (
            <div className="py-6 flex flex-col items-center gap-1 text-center">
              <span className="text-[13px] font-bold text-[var(--color-text)]">Your slip is empty</span>
              <span className="text-[12px] text-[rgba(247,243,233,0.55)]">Tap any price on the board. Tap more to build a parlay.</span>
            </div>
          )}
          <div>
            {legs.map((l, i) => (
              <SlipLegRow
                key={l.side.key}
                leg={l}
                showSport={t.multiSport}
                onPrice={(v) => p.onPrice(i, v)}
                onRemove={() => p.onRemove(i)}
              />
            ))}
          </div>
          {legs.length > 0 && (
            <div className="mt-1 pt-4 border-t border-[rgba(255,255,255,0.12)] flex flex-col gap-4">
              <div className="flex items-end justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(247,243,233,0.55)]">Units</span>
                  <UnitsStepper value={p.units} onChange={p.onUnits} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(247,243,233,0.55)]">
                    {t.sameGame ? "Book's SGP price" : t.isParlay ? "Parlay odds" : "Odds"}
                  </span>
                  {t.sameGame ? (
                    <input
                      aria-label="Same game parlay price"
                      inputMode="decimal"
                      placeholder="book's price"
                      value={p.sgpPrice}
                      onChange={(e) => p.onSgpPrice(e.target.value)}
                      className="w-28 h-10 px-2 text-right text-[22px] font-extrabold tabular-nums rounded-lg bg-[rgba(0,0,0,0.28)] border border-[rgba(255,255,255,0.10)] text-[var(--color-text)] placeholder:text-[13px] placeholder:font-semibold placeholder:text-[rgba(247,243,233,0.4)] focus:outline-none focus:border-[rgba(196,181,253,0.6)]"
                    />
                  ) : (
                    <span className="text-[30px] leading-none font-extrabold tabular-nums tracking-[-0.02em] text-[var(--color-text)]">
                      {t.combined !== null ? fmtPrice(t.combined, fmt) : "--"}
                    </span>
                  )}
                  <span className="text-[12px] font-semibold tabular-nums text-[rgba(247,243,233,0.7)]">
                    {book !== OTHER_BOOK && <>at {bookName(book)} · </>}
                    To win {t.toWin !== null ? `${t.toWin.toFixed(2)}u` : "--"}
                  </span>
                </div>
              </div>
              {(t.sameGame || t.multiSport || !t.unitsOk) && (
                <div className="flex flex-col gap-1.5 text-[11px] leading-snug text-[rgba(247,243,233,0.7)]">
                  {t.sameGame && <span>Same game parlay: enter the price your book gave you. Books don&apos;t price these as the legs multiplied.</span>}
                  {t.multiSport && (
                    <span>
                      Counts on your VIP record as Multi-sport, not toward your {t.sports.join(" or ")} selling record. Locks
                      when the first game starts.
                    </span>
                  )}
                  {!t.unitsOk && <span>Units between 0.1 and 10.</span>}
                </div>
              )}
              <button
                type="button"
                className={`${VIP_PRIMARY_BTN} w-full h-11`}
                disabled={!t.allPriced || !t.unitsOk || t.combined === null}
                onClick={p.onReview}
              >
                {p.fixing ? "Review fix" : "Review pick"}
              </button>
            </div>
          )}
          {/* Outside the legs block: an emptied slip must still leave the fix. */}
          {p.fixing && (
            <button
              type="button"
              onClick={p.onCancelFix}
              className="mt-3 self-center text-[12px] font-semibold text-[rgba(247,243,233,0.6)] hover:text-[var(--color-text)]"
            >
              Keep the posted pick
            </button>
          )}
        </div>
      </div>
    </div>
  );
  if (!drawer) return card;
  return createPortal(
    <>
      {p.open && <div aria-hidden="true" onClick={() => p.onOpen(false)} className="fixed inset-0 z-[58] bg-[rgba(0,0,0,0.55)]" />}
      {!p.open && (
        <SlipRibbon count={legs.length} price={t.combined !== null ? fmtPrice(t.combined, fmt) : null} onOpen={() => p.onOpen(true)} />
      )}
      {card}
    </>,
    document.body,
  );
}
