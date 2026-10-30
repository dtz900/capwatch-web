"use client";

/* Shared pieces of the pick builder. Markup and classes come from the
 * approved mock (src/app/dev/vip-fixtures/PickBuilderMock.tsx). */

import { createContext, useContext, type ReactNode } from "react";
import { TeamLogo } from "@/components/slate/TeamLogo";
import { VIP_GLASS, VIP_GLASS_SHEEN } from "@/components/vip/styles";
import type { BoardSide, VipSport } from "@/lib/vip/types";
import { teamName, type Period } from "./adapt";
import { OTHER_BOOK, bookName } from "./books";
import { fmtPrice, type Fmt } from "./odds";
import { quoteAt, type SlipLeg } from "./slip";

export const FmtCtx = createContext<Fmt>("american");
export const BookCtx = createContext<string>("fanduel");
/** One period for the whole board. */
export const PeriodCtx = createContext<Period>("Game");

export type TapFn = (side: BoardSide, gameId: string) => void;

export function PriceButton({ side: sd, selected, onTap }: { side: BoardSide; selected: boolean; onTap: () => void }) {
  const fmt = useContext(FmtCtx);
  const book = useContext(BookCtx);
  const quote = quoteAt(sd, book);
  const shown = quote ?? sd.price;
  const notHere = quote === null && book !== OTHER_BOOK;
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={selected}
      title={notHere ? `Not at ${bookName(book)}. Market price shown.` : undefined}
      className={`group h-[52px] w-full rounded-lg border flex flex-col items-center justify-center gap-0.5 leading-none transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(.22,1,.36,1)] active:scale-[0.98] ${
        selected
          ? "border-[rgba(196,181,253,0.55)] bg-[linear-gradient(160deg,#6d28d9_0%,#4c1d95_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.035)] hover:bg-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.14)]"
      }`}
    >
      <span className="text-[14px] font-extrabold tabular-nums tracking-[-0.01em] text-[var(--color-text)]">{sd.short}</span>
      <span
        className={`text-[12px] font-semibold tabular-nums ${
          selected ? "text-[rgba(247,243,233,0.85)]" : "text-[var(--color-text-soft)] group-hover:text-[var(--color-text)]"
        }`}
      >
        {fmtPrice(shown, fmt)}
        {notHere && <span className="ml-1 text-[9px] font-bold uppercase tracking-[0.12em] opacity-60">mkt</span>}
      </span>
    </button>
  );
}

/** Empty cell where a market is not posted, so the grid keeps its columns. */
export function NoPrice() {
  return (
    <div className="h-[52px] w-full rounded-lg border border-dashed border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[11px] text-[var(--color-text-muted)]">
      --
    </div>
  );
}

export function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 px-3 rounded-full text-[11px] font-bold border transition shrink-0 ${
        on
          ? "bg-[var(--color-text)] text-[#0f0f14] border-[var(--color-text)]"
          : "border-[var(--color-border)] text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
      }`}
    >
      {children}
    </button>
  );
}

export function MoreLink({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition-colors duration-200 ${
        on
          ? "bg-[rgba(255,255,255,0.08)] text-[var(--color-text)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.04)]"
      }`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: Array<[T, ReactNode]>;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.05)] max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`${size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3.5 text-[12px]"} shrink-0 rounded-md font-bold whitespace-nowrap transition-colors duration-200 ${
            v === value
              ? "bg-[var(--color-text)] text-[#0f0f14]"
              : "text-[var(--color-text-soft)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${VIP_GLASS} ${className}`}>
      <div aria-hidden="true" className={VIP_GLASS_SHEEN} />
      <div className="relative px-4 sm:px-5 pt-4 pb-4">{children}</div>
    </div>
  );
}

export function TeamCell({ sport, abbr }: { sport: VipSport; abbr: string }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <TeamLogo abbr={abbr} sport={sport} size={30} flat />
      <div className="min-w-0">
        <div className="text-[15px] font-bold tracking-[-0.01em] text-[var(--color-text)] truncate">{teamName(sport, abbr)}</div>
      </div>
    </div>
  );
}

/** Logo for a leg: the team it backs, or both teams for totals, props and
 *  anything off the board. */
export function LegLogo({ leg }: { leg: SlipLeg }) {
  const g = leg.game;
  const sel = leg.side.leg.selection;
  const backed = leg.side.leg.player_name ? null : sel === g.away ? g.away : sel === g.home ? g.home : null;
  if (backed) {
    return (
      <div className="w-9 h-9 shrink-0 rounded-lg bg-[rgba(0,0,0,0.25)] flex items-center justify-center">
        <TeamLogo abbr={backed} sport={g.sport} size={26} flat />
      </div>
    );
  }
  return (
    <div className="relative w-9 h-9 shrink-0 rounded-lg bg-[rgba(0,0,0,0.25)]">
      <span className="absolute left-0.5 top-0.5">
        <TeamLogo abbr={g.away} sport={g.sport} size={18} flat />
      </span>
      <span className="absolute right-0.5 bottom-0.5">
        <TeamLogo abbr={g.home} sport={g.sport} size={18} flat />
      </span>
    </div>
  );
}
