"use client";
import { useEffect, useRef, useState } from "react";
import type { LastPick } from "@/lib/types";
import { formatBetDescriptor, formatMarketLabel, normalizeMarket } from "@/lib/markets";
import { formatUnitsSmart } from "@/lib/formatters";
import { XIcon } from "@/components/icons/XIcon";

interface Props {
  picks: LastPick[];
  limit?: number;
}

interface Palette {
  bg: string;
  bgHover: string;
  text: string;
  dot: string;
  expandedBg: string;
  expandedBorder: string;
}

const PALETTE_W: Palette = {
  bg: "bg-[rgba(25,245,124,0.10)]",
  bgHover: "hover:bg-[rgba(25,245,124,0.18)]",
  text: "text-[var(--color-pos)]",
  dot: "bg-[var(--color-pos)]",
  expandedBg: "bg-[rgba(25,245,124,0.14)]",
  expandedBorder: "border-[rgba(25,245,124,0.65)]",
};
const PALETTE_L: Palette = {
  bg: "bg-[rgba(239,68,68,0.10)]",
  bgHover: "hover:bg-[rgba(239,68,68,0.18)]",
  text: "text-[var(--color-neg)]",
  dot: "bg-[var(--color-neg)]",
  expandedBg: "bg-[rgba(239,68,68,0.14)]",
  expandedBorder: "border-[rgba(239,68,68,0.65)]",
};
const PALETTE_P: Palette = {
  bg: "bg-[rgba(255,255,255,0.05)]",
  bgHover: "hover:bg-[rgba(255,255,255,0.10)]",
  text: "text-[var(--color-text-muted)]",
  dot: "bg-[var(--color-text-muted)]",
  expandedBg: "bg-[rgba(255,255,255,0.06)]",
  expandedBorder: "border-[rgba(255,255,255,0.30)]",
};
const PALETTE_PARLAY: Palette = {
  bg: "bg-[rgba(245,197,74,0.10)]",
  bgHover: "hover:bg-[rgba(245,197,74,0.18)]",
  text: "text-[var(--color-gold)]",
  dot: "bg-[var(--color-gold)]",
  expandedBg: "bg-[rgba(245,197,74,0.14)]",
  expandedBorder: "border-[rgba(245,197,74,0.65)]",
};

function paletteFor(pick: LastPick): Palette {
  if (pick.kind === "parlay") return PALETTE_PARLAY;
  if (pick.outcome === "W") return PALETTE_W;
  if (pick.outcome === "L") return PALETTE_L;
  return PALETTE_P;
}

export function PickTiles({ picks, limit = 4 }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const visible = picks.slice(0, limit);

  useEffect(() => {
    if (openIdx === null) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenIdx(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openIdx]);

  if (visible.length === 0) {
    return <span className="text-[11px] italic text-[var(--color-text-muted)]">No graded picks yet</span>;
  }

  return (
    <div ref={wrapRef} className="flex gap-1.5 w-full">
      {visible.map((pick, i) => (
        <Pill
          key={i}
          pick={pick}
          open={openIdx === i}
          onToggle={() => setOpenIdx(openIdx === i ? null : i)}
        />
      ))}
    </div>
  );
}

function Pill({ pick, open, onToggle }: { pick: LastPick; open: boolean; onToggle: () => void }) {
  const palette = paletteFor(pick);
  const { primary, secondary } = compactContent(pick);

  return (
    <div className="relative flex-1 min-w-0">
      <div className="invisible h-8" aria-hidden="true" />

      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`absolute inset-0 w-full h-8 px-2.5 rounded-full
                    ${palette.bg} ${palette.bgHover}
                    ${open ? "ring-1 ring-[rgba(255,255,255,0.10)]" : ""}
                    flex items-center gap-1.5 text-left
                    transition-colors duration-150 cursor-pointer overflow-hidden`}
      >
        <span aria-hidden="true" className={`shrink-0 w-1.5 h-1.5 rounded-full ${palette.dot}`} />
        <span className="flex-1 min-w-0 leading-tight flex items-baseline gap-1">
          <span className={`text-[11px] font-extrabold tracking-[-0.005em] truncate ${palette.text}`}>
            {primary}
          </span>
          <span className="text-[10px] font-medium text-[var(--color-text-muted)] truncate">
            {secondary}
          </span>
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Pick details"
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50
                      w-[320px] rounded-xl overflow-hidden
                      border border-[rgba(255,255,255,0.08)]
                      bg-[linear-gradient(180deg,#1e1e25_0%,#131318_100%)]
                      shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_2px_4px_rgba(0,0,0,0.4),0_24px_48px_-12px_rgba(0,0,0,0.7)]
                      animate-[popover-fade_140ms_ease-out]`}
        >
          <div aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${palette.dot}`} />
          <div className="relative pl-[18px] pr-4 py-4">
            <PickDetails pick={pick} />
          </div>
          <div
            aria-hidden="true"
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-[5px]
                       w-2.5 h-2.5 rotate-45
                       bg-[#131318]
                       border-r border-b border-[rgba(255,255,255,0.08)]"
          />
        </div>
      )}
    </div>
  );
}

function PickDetails({ pick }: { pick: LastPick }) {
  const dateLabel = pick.posted_at
    ? new Date(pick.posted_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;
  const outcomeBg = pick.outcome === "W" ? "bg-[var(--color-pos-soft)] text-[var(--color-pos)]" :
                    pick.outcome === "L" ? "bg-[var(--color-neg-soft)] text-[var(--color-neg)]" :
                    "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)]";
  const oddsStr = pick.kind !== "parlay" && pick.odds_taken != null
    ? `${pick.odds_taken > 0 ? "+" : ""}${pick.odds_taken}`
    : null;
  const selectionBare = pick.kind === "parlay"
    ? (pick.leg_count ? `${pick.leg_count}-leg parlay` : "Parlay")
    : strippedSelection(pick);
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          {formatMarketLabel(pick)}
        </span>
        <span className={`text-[10px] font-extrabold uppercase tracking-[0.10em] px-2 py-[3px] rounded ${outcomeBg}`}>
          {pick.outcome === "W" ? "Win" : pick.outcome === "L" ? "Loss" : "Push"}
        </span>
      </div>

      {pick.game_label && (
        <span className="text-[11px] text-[var(--color-text-muted)] font-semibold mb-1.5">{pick.game_label}</span>
      )}

      <div className="flex items-end justify-between gap-3 mb-1">
        <span className={`text-[16px] font-extrabold tracking-[-0.015em] leading-tight flex-1 min-w-0 ${pick.kind === "parlay" ? "text-[var(--color-gold)]" : "text-[var(--color-text)]"}`}>
          {selectionBare}
        </span>
        {oddsStr && (
          <span className="shrink-0 text-[15px] font-extrabold tabular-nums tracking-[-0.01em] text-[var(--color-text-soft)]">
            {oddsStr}
          </span>
        )}
      </div>

      {pick.kind === "parlay" && pick.profit_units != null && (
        <span className={`text-[13px] font-bold tabular-nums mt-1 ${pick.profit_units >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}`}>
          {formatUnitsSmart(pick.profit_units)} units
        </span>
      )}
      {!oddsStr && pick.kind !== "parlay" && (
        <span className="text-[10px] italic text-[var(--color-text-muted)] mt-1">Odds not provided</span>
      )}

      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-[rgba(255,255,255,0.05)]">
        {dateLabel ? (
          <span className="text-[10px] font-semibold tabular-nums text-[var(--color-text-muted)]">
            {dateLabel}
          </span>
        ) : <span />}
        {pick.tweet_url && (
          <a
            href={pick.tweet_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.10em]
                       text-[var(--color-text-soft)] hover:text-[var(--color-text)]
                       transition-colors"
          >
            <XIcon size={10} />
            <span>View tweet</span>
          </a>
        )}
      </div>
    </div>
  );
}

function strippedSelection(pick: LastPick): string {
  const sel = (pick.selection ?? "").trim();
  if (!sel) return pick.market || "Pick";
  const out = sel;
  if (pick.odds_taken != null) {
    const sign = pick.odds_taken > 0 ? "+" : "";
    const oddsStr = `${sign}${pick.odds_taken}`;
    if (out.endsWith(oddsStr)) return out.slice(0, -oddsStr.length).trim();
  }
  return out;
}

/**
 * Pill content: the market type as the bold label, odds (or units for parlays)
 * as the muted secondary. The full selection lives in the click-expanded popover.
 */
function compactContent(pick: LastPick): { primary: string; secondary: string } {
  if (pick.kind === "parlay") {
    return {
      primary: "Parlay",
      secondary: pick.profit_units != null ? `${formatUnitsSmart(pick.profit_units)}u` : "",
    };
  }

  const bucket = pick.market ? normalizeMarket(pick.market) : "";
  const label = MARKET_LABEL[bucket] || bucket || "Pick";
  return { primary: label, secondary: oddsText(pick) };
}

const MARKET_LABEL: Record<string, string> = {
  Moneyline: "ML",
  Spread: "Spread",
  Total: "Total",
  "Player prop": "Prop",
  "Game prop": "Game",
};

function oddsText(pick: LastPick): string {
  if (pick.odds_taken == null) return "";
  return `${pick.odds_taken > 0 ? "+" : ""}${pick.odds_taken}`;
}
