"use client";
import { useEffect, useRef, useState } from "react";
import type { LastPick } from "@/lib/types";
import { formatBetDescriptor, formatMarketLabel } from "@/lib/markets";
import { XIcon } from "@/components/icons/XIcon";

interface Props {
  picks: LastPick[];
  limit?: number;
}

interface Palette {
  bg: string;
  border: string;
  hoverBg: string;
  hoverBorder: string;
  expandedBg: string;
  expandedBorder: string;
  text: string;
  rail: string;
}

const TILE_OUTCOME: Record<"W" | "L" | "P", Palette> = {
  W: {
    bg: "bg-[rgba(25,245,124,0.10)]",
    border: "border-[rgba(25,245,124,0.32)]",
    hoverBg: "hover:bg-[rgba(25,245,124,0.16)]",
    hoverBorder: "hover:border-[rgba(25,245,124,0.55)]",
    expandedBg: "bg-[rgba(25,245,124,0.14)]",
    expandedBorder: "border-[rgba(25,245,124,0.65)]",
    text: "text-[var(--color-pos)]",
    rail: "bg-[var(--color-pos)]",
  },
  L: {
    bg: "bg-[rgba(239,68,68,0.10)]",
    border: "border-[rgba(239,68,68,0.32)]",
    hoverBg: "hover:bg-[rgba(239,68,68,0.16)]",
    hoverBorder: "hover:border-[rgba(239,68,68,0.55)]",
    expandedBg: "bg-[rgba(239,68,68,0.14)]",
    expandedBorder: "border-[rgba(239,68,68,0.65)]",
    text: "text-[var(--color-neg)]",
    rail: "bg-[var(--color-neg)]",
  },
  P: {
    bg: "bg-[rgba(255,255,255,0.04)]",
    border: "border-[rgba(255,255,255,0.12)]",
    hoverBg: "hover:bg-[rgba(255,255,255,0.06)]",
    hoverBorder: "hover:border-[rgba(255,255,255,0.20)]",
    expandedBg: "bg-[rgba(255,255,255,0.06)]",
    expandedBorder: "border-[rgba(255,255,255,0.30)]",
    text: "text-[var(--color-text-muted)]",
    rail: "bg-[var(--color-text-muted)]",
  },
};

const PARLAY_OVERRIDE: Palette = {
  bg: "bg-[rgba(245,197,74,0.08)]",
  border: "border-[rgba(245,197,74,0.30)]",
  hoverBg: "hover:bg-[rgba(245,197,74,0.14)]",
  hoverBorder: "hover:border-[rgba(245,197,74,0.55)]",
  expandedBg: "bg-[rgba(245,197,74,0.12)]",
  expandedBorder: "border-[rgba(245,197,74,0.65)]",
  text: "text-[var(--color-gold)]",
  rail: "bg-[var(--color-gold)]",
};

export function PickTiles({ picks, limit = 5 }: Props) {
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
        <Tile
          key={i}
          pick={pick}
          open={openIdx === i}
          onToggle={() => setOpenIdx(openIdx === i ? null : i)}
        />
      ))}
    </div>
  );
}

function Tile({ pick, open, onToggle }: { pick: LastPick; open: boolean; onToggle: () => void }) {
  const palette = pick.kind === "parlay" ? PARLAY_OVERRIDE : TILE_OUTCOME[pick.outcome];

  return (
    <div className="relative flex-1 min-w-0">
      {/* Reserve the tile footprint so siblings don't reflow when expanded. */}
      <div className="invisible h-10" aria-hidden="true" />

      {/* Closed-state tile sits in the reserved footprint */}
      {!open && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          aria-haspopup="dialog"
          className={`absolute inset-0 w-full h-10 pl-2.5 pr-2 rounded-md border
                      ${palette.bg} ${palette.border}
                      ${palette.hoverBg} ${palette.hoverBorder}
                      flex items-center gap-2 text-left
                      transition-all duration-150 cursor-pointer overflow-hidden`}
        >
          <span aria-hidden="true" className={`shrink-0 w-[3px] h-5 rounded-full ${palette.rail}`} />
          <span className="flex-1 min-w-0 leading-tight">
            <span className={`block text-[10px] font-extrabold uppercase tracking-[0.04em] truncate ${palette.text}`}>
              {compactLabel(pick)}
            </span>
            <span className="block text-[9px] font-semibold text-[var(--color-text-muted)] truncate">
              {compactSubLabel(pick)}
            </span>
          </span>
          <span className={`shrink-0 text-[10px] font-extrabold ${palette.text}`}>
            {pick.outcome}
          </span>
        </button>
      )}

      {/* Expanded popover: horizontally centered on the tile, scales from center */}
      {open && (
        <div
          role="dialog"
          aria-label="Pick details"
          className={`absolute top-0 left-1/2 -translate-x-1/2 z-50
                      w-[280px] rounded-lg border-2 overflow-hidden
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

function compactLabel(pick: LastPick): string {
  if (pick.kind === "parlay") return pick.leg_count ? `${pick.leg_count}-LEG` : "PARLAY";
  if (pick.selection) {
    const first = pick.selection.split(/\s+/)[0];
    return first.slice(0, 4).toUpperCase();
  }
  return pick.market?.toUpperCase() ?? "PICK";
}

function compactSubLabel(pick: LastPick): string {
  if (pick.kind === "parlay") {
    if (pick.profit_units != null) {
      const sign = pick.profit_units >= 0 ? "+" : "";
      return `${sign}${pick.profit_units.toFixed(1)}u`;
    }
    return "";
  }
  if (pick.odds_taken != null) {
    const sign = pick.odds_taken > 0 ? "+" : "";
    return `${sign}${pick.odds_taken}`;
  }
  if (pick.line != null) return String(pick.line);
  return "";
}
