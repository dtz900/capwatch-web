"use client";
import { useEffect, useRef, useState } from "react";
import type { LastPick } from "@/lib/types";
import { formatBetDescriptor, formatMarketLabel, normalizeMarket } from "@/lib/markets";
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

      {!open && (
        <button
          type="button"
          onClick={onToggle}
          aria-haspopup="dialog"
          aria-expanded={false}
          className={`absolute inset-0 w-full h-8 px-2.5 rounded-full
                      ${palette.bg} ${palette.bgHover}
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
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Pick details"
          className={`absolute top-0 left-1/2 -translate-x-1/2 z-50
                      w-[280px] rounded-xl border-2 overflow-hidden
                      ${palette.expandedBorder}
                      shadow-[0_16px_48px_-8px_rgba(0,0,0,0.8)]
                      animate-[tile-expand_140ms_ease-out]`}
          style={{ transformOrigin: "center" }}
        >
          <div aria-hidden="true" className="absolute inset-0 bg-[#13131a]" />
          <div aria-hidden="true" className={`absolute inset-0 ${palette.expandedBg}`} />
          <div className="relative p-3.5 text-[12px] leading-relaxed">
            <PickDetails pick={pick} />
          </div>
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
  const noOdds = pick.kind !== "parlay" && pick.odds_taken == null;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {formatMarketLabel(pick)}
        </span>
        <span className={`text-[10px] font-extrabold uppercase tracking-[0.10em] px-2 py-0.5 rounded ${outcomeBg}`}>
          {pick.outcome === "W" ? "Win" : pick.outcome === "L" ? "Loss" : "Push"}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {pick.game_label && (
          <span className="text-[var(--color-text-muted)] text-[11px] font-semibold">{pick.game_label}</span>
        )}
        <span className={`text-[15px] font-extrabold tracking-[-0.01em] ${pick.kind === "parlay" ? "text-[var(--color-gold)]" : ""}`}>
          {formatBetDescriptor(pick)}
        </span>
        {pick.kind === "parlay" && pick.profit_units != null && (
          <span className={`text-[13px] font-bold tabular-nums ${pick.profit_units >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}`}>
            {pick.profit_units >= 0 ? "+" : ""}{pick.profit_units.toFixed(1)} units
          </span>
        )}
        {noOdds && (
          <span className="text-[10px] italic text-[var(--color-text-muted)]">Odds not provided</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
        {dateLabel ? (
          <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-[var(--color-text-muted)]">
            Posted {dateLabel}
          </span>
        ) : <span />}
        {pick.tweet_url && (
          <a
            href={pick.tweet_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.10em]
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

/**
 * Two-piece compact label: bold primary + muted secondary.
 * Aims to be readable instead of just slicing 4 chars off the selection.
 */
function compactContent(pick: LastPick): { primary: string; secondary: string } {
  if (pick.kind === "parlay") {
    return {
      primary: pick.leg_count ? `${pick.leg_count}-leg` : "Parlay",
      secondary: pick.profit_units != null
        ? `${pick.profit_units >= 0 ? "+" : ""}${pick.profit_units.toFixed(1)}u`
        : "",
    };
  }

  const bucket = pick.market ? normalizeMarket(pick.market) : "";

  if (bucket === "Total") {
    const sel = (pick.selection ?? "").toLowerCase();
    const lineStr = pick.line != null ? String(pick.line) : "";
    if (sel.startsWith("over"))  return { primary: `O ${lineStr}`.trim(), secondary: oddsText(pick) };
    if (sel.startsWith("under")) return { primary: `U ${lineStr}`.trim(), secondary: oddsText(pick) };
    return { primary: lineStr || "Total", secondary: oddsText(pick) };
  }

  if (bucket === "Spread") {
    const team = teamAbbr(pick.selection);
    const line = pick.line != null
      ? (pick.line > 0 ? `+${pick.line}` : String(pick.line))
      : "";
    return { primary: [team, line].filter(Boolean).join(" "), secondary: oddsText(pick) };
  }

  if (bucket === "Player prop") {
    return { primary: "Prop", secondary: oddsText(pick) || (pick.line != null ? String(pick.line) : "") };
  }

  if (bucket === "Game prop") {
    return { primary: "Game prop", secondary: oddsText(pick) };
  }

  // Default = Moneyline / unknown
  const team = teamAbbr(pick.selection);
  return { primary: team || (bucket || "Pick"), secondary: oddsText(pick) || "ML" };
}

function teamAbbr(selection: string | null): string {
  if (!selection) return "";
  // Strip embedded odds like "Cleveland Guardians -136" → "Cleveland Guardians"
  const cleaned = selection.replace(/\s*[+-]?\d+(?:\.\d+)?\s*$/, "").trim();
  // Take the first word, slice 3 chars uppercase. "Cleveland" → "CLE", "NYY" → "NYY".
  const first = cleaned.split(/\s+/)[0] ?? "";
  return first.slice(0, 3).toUpperCase();
}

function oddsText(pick: LastPick): string {
  if (pick.odds_taken == null) return "";
  return `${pick.odds_taken > 0 ? "+" : ""}${pick.odds_taken}`;
}
