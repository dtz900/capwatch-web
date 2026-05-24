"use client";

import { useState } from "react";
import { XIcon } from "@/components/icons/XIcon";
import { AffiliatePicker } from "@/components/affiliate/AffiliatePicker";
import { AffiliateDisclaimer } from "@/components/affiliate/AffiliateDisclaimer";
import { formatBetDescriptor, formatMarketLabel } from "@/lib/markets";
import type { SportsbookSummary } from "@/lib/api";
import type { HistoryPick } from "@/lib/types";
import { ParlayLegGlyphs } from "@/components/capper/ParlayLegGlyphs";
import { ParlayLegList } from "@/components/capper/ParlayLegList";

function formatPostedAt(iso: string | null): string | null {
  if (!iso) return null;
  const posted = new Date(iso).getTime();
  const diffMin = Math.floor((Date.now() - posted) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function formatStakeUnits(u: number | null): string | null {
  if (u == null || u <= 0) return null;
  // Defensive display clamp. Vision parser sometimes misreads a dollar
  // figure ("$1,000.00") as a 1000-unit bet, and the backend's
  // MAX_REASONABLE_UNITS clamp only catches >10. We don't know the
  // capper's per-unit dollar baseline, so showing anything above ~5u
  // as "1u" is the conservative default until the parser distinguishes
  // dollars from units.
  const clamped = u > 5 ? 1 : u;
  return `${clamped.toFixed(clamped % 1 === 0 ? 0 : 1)}u`;
}

function PendingRow({
  pick,
  sportsbooks,
}: {
  pick: HistoryPick;
  sportsbooks: SportsbookSummary[];
}) {
  const isParlay = pick.kind === "parlay";
  const posted = formatPostedAt(pick.posted_at);
  const stake = formatStakeUnits(pick.units);
  const isDeleted = !!pick.was_deleted_on_x;
  const deletedPostStart = !!pick.deleted_after_game_start;

  const hasExpandableLegs = isParlay && !!pick.legs && pick.legs.length > 0;
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => {
    if (hasExpandableLegs) setExpanded((v) => !v);
  };

  return (
    <div>
      <div
        onClick={hasExpandableLegs ? toggleExpanded : undefined}
        onKeyDown={
          hasExpandableLegs
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleExpanded();
                }
              }
            : undefined
        }
        role={hasExpandableLegs ? "button" : undefined}
        tabIndex={hasExpandableLegs ? 0 : undefined}
        aria-expanded={hasExpandableLegs ? expanded : undefined}
        className={`flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-[rgba(255,255,255,0.03)] transition-colors${hasExpandableLegs ? " cursor-pointer" : ""}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span
              className="text-[9px] uppercase tracking-[0.14em] font-bold px-1.5 py-0.5 rounded
                         bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)]"
            >
              {formatMarketLabel({
                kind: isParlay ? "parlay" : "straight",
                market: pick.market,
                selection: pick.selection,
                line: pick.line,
                odds_taken: pick.odds_taken,
              })}
            </span>
            {pick.game_label && (
              <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                {pick.game_label}
              </span>
            )}
          </div>
          <div className="text-[12px] font-semibold text-[var(--color-text)] truncate">
            {formatBetDescriptor({
              kind: isParlay ? "parlay" : "straight",
              leg_count: pick.leg_count ?? null,
              market: pick.market,
              selection: pick.selection,
              line: pick.line,
              odds_taken: pick.odds_taken,
            })}
            {isParlay && pick.legs && pick.legs.length > 0 && (
              <>
                {" "}
                <ParlayLegGlyphs legs={pick.legs} />
              </>
            )}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5 flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
            {stake && <span>{stake}</span>}
            {posted && <span className="opacity-80">{posted}</span>}
            {isDeleted && !deletedPostStart && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded
                           text-[9px] uppercase tracking-[0.12em] font-bold
                           bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.45)]
                           text-[#f59e0b]"
                title="The capper deleted this tweet from X. TailSlips still grades the pick."
              >
                Deleted on X
              </span>
            )}
            {deletedPostStart && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded
                           text-[9px] uppercase tracking-[0.12em] font-bold
                           bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.55)]
                           text-[#ef4444]"
                title="The capper deleted this tweet AFTER the game started. TailSlips still grades the pick."
              >
                Deleted after first pitch
              </span>
            )}
          </div>
        </div>
        <div
          className="shrink-0 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <AffiliatePicker
            books={sportsbooks}
            targetType={isParlay ? "parlay" : "pick"}
            targetId={isParlay ? (pick.parlay_id ?? pick.id) : pick.id}
          />
          {pick.tweet_url && !isDeleted && (
            <a
              href={pick.tweet_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View tweet"
              className="w-7 h-7 flex items-center justify-center rounded-md
                         bg-[rgba(255,255,255,0.04)] text-[var(--color-text-soft)]
                         hover:text-white hover:bg-[rgba(255,255,255,0.10)] transition-colors"
            >
              <XIcon size={11} glow />
            </a>
          )}
          {pick.tweet_url && isDeleted && (
            <span
              aria-label="Tweet deleted by capper"
              title="The capper deleted this tweet. TailSlips still grades the pick."
              className="w-7 h-7 flex items-center justify-center rounded-md
                         bg-[rgba(245,158,11,0.06)] text-[#f59e0b] opacity-70"
            >
              <XIcon size={11} />
            </span>
          )}
        </div>
      </div>
      {hasExpandableLegs && expanded && <ParlayLegList legs={pick.legs!} />}
    </div>
  );
}

export function PendingBlock({
  picks,
  sportsbooks = [],
}: {
  picks: HistoryPick[];
  sportsbooks?: SportsbookSummary[];
}) {
  if (picks.length === 0) return null;
  const deletedCount = picks.reduce((n, p) => (p.was_deleted_on_x ? n + 1 : n), 0);
  const afterStartCount = picks.reduce(
    (n, p) => (p.deleted_after_game_start ? n + 1 : n),
    0,
  );

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[var(--color-pos)] animate-pulse" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
          Live · {picks.length} pending
        </span>
        {deletedCount > 0 && (
          <span
            className="text-[10px] uppercase tracking-[0.14em] text-[#f59e0b] font-bold"
            title={
              afterStartCount > 0
                ? `${afterStartCount} of these were deleted after first pitch`
                : undefined
            }
          >
            · {deletedCount} deleted on X
            {afterStartCount > 0 ? ` (${afterStartCount} post-start)` : ""}
          </span>
        )}
      </div>
      <div className="flex flex-col">
        {picks.map((p) => (
          <PendingRow key={p.id} pick={p} sportsbooks={sportsbooks} />
        ))}
      </div>
      <AffiliateDisclaimer books={sportsbooks} />
    </section>
  );
}
