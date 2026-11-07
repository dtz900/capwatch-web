"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { emptyQueueCopy } from "../audit/labels";
import { formatOdds } from "./reviewLabels";
import type { ReviewRow } from "./reviewRow";

interface Props {
  rows: ReviewRow[];
  selectedId: number | null;
  selection: ReadonlySet<number>;
  groupSizes: Map<number, number>;
  onSelect: (id: number) => void;
  onSelectGroup: (rawId: number, on: boolean) => void;
  paging: { offset: number; pageSize: number; total: number };
  newerHref: string | null;
  olderHref: string | null;
  /** When set, replaces the row list (the residue list is open). */
  bucket: ReactNode | null;
  residueCount: number;
  onOpenResidue: () => void;
  sportLabel: string;
}

/** The one red flag a row carries, by precedence: started, no game, then a real hold reason. */
function rowFlag(r: ReviewRow): string | null {
  if (r.started_minutes != null) return "Started before the tweet";
  if (r.game_id == null && r.parlay_id == null) return "No game";
  if (!r.reason_soft) return r.reason_label;
  return null;
}

export function ReviewQueue({
  rows,
  selectedId,
  selection,
  groupSizes,
  onSelect,
  onSelectGroup,
  paging,
  newerHref,
  olderHref,
  bucket,
  residueCount,
  onOpenResidue,
  sportLabel,
}: Props) {
  const from = paging.offset + 1;
  const to = Math.min(paging.offset + rows.length, paging.total);
  const groupSelected = (rawId: number) =>
    rows.filter((r) => r.raw_id === rawId).every((r) => selection.has(r.pick_id));
  return (
    <div className="border-r border-[var(--color-border)] flex flex-col min-h-0 h-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {bucket ? (
          bucket
        ) : rows.length === 0 ? (
          <div className="px-[22px] py-[60px] text-center text-[var(--color-text-muted)]">
            {emptyQueueCopy(sportLabel)}
          </div>
        ) : (
          rows.map((r) => {
            const on = r.pick_id === selectedId;
            const picked = selection.has(r.pick_id);
            const flag = rowFlag(r);
            const rawId = r.raw_id;
            const grp = rawId != null ? (groupSizes.get(rawId) ?? 1) : 1;
            return (
              <button
                key={r.pick_id}
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSelect(r.pick_id);
                }}
                aria-current={on ? "true" : undefined}
                className={`relative w-full grid grid-cols-[50px_1fr_auto] gap-3 items-center pl-[22px] pr-[18px] py-3 border-b border-[var(--color-border)] text-left hover:bg-[rgba(255,255,255,0.02)] ${
                  on ? "bg-[rgba(247,243,233,0.055)]" : ""
                }`}
              >
                {on && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--color-text)]" />}
                <span className="bg-[var(--color-text)] text-[#0a0a0c] text-[10px] font-extrabold tracking-[0.06em] rounded-[5px] text-center py-[5px] w-[50px]">
                  {r.sport ?? "?"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] leading-[19px] font-extrabold">
                    {r.selection ?? r.market ?? "Untitled pick"}
                    {r.odds_taken != null && (
                      <span className="ml-[6px] font-bold text-[var(--color-text-soft)] tabular-nums">
                        {formatOdds(r.odds_taken)}
                      </span>
                    )}
                  </span>
                  <span className="block mt-[3px] text-[11.5px] leading-[16px] font-semibold text-[var(--color-text-muted)] truncate">
                    {flag && <span className="font-extrabold text-[var(--color-neg)]">{flag} · </span>}@
                    {r.capper_handle ?? "unknown"}
                    {grp > 1 && rawId != null && (
                      <>
                        {" · "}
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectGroup(rawId, !groupSelected(rawId));
                          }}
                          className="font-extrabold text-[var(--color-text-soft)] underline decoration-[rgba(255,255,255,0.13)] underline-offset-[3px] hover:text-[var(--color-text)]"
                        >
                          {groupSelected(rawId) ? "tweet selected" : `${grp} from this tweet, select all`}
                        </span>
                      </>
                    )}
                  </span>
                </span>
                <span
                  className={`text-right text-[11px] tabular-nums ${
                    picked ? "font-extrabold text-[var(--color-text)]" : "font-semibold text-[var(--color-text-muted)]"
                  }`}
                >
                  <span className="block">{picked ? "✓ selected" : r.posted_label}</span>
                  <span className="block">#{r.pick_id}</span>
                </span>
              </button>
            );
          })
        )}

        {!bucket && (rows.length > 0 || newerHref || olderHref) && (
          <div className="flex items-center justify-between px-[22px] py-3 text-[11px] font-semibold text-[var(--color-text-muted)]">
            <span>
              {rows.length > 0
                ? `Showing ${from}-${to} of ${paging.total}`
                : `Nothing at this offset (${paging.total} total)`}
            </span>
            <span className="flex gap-3 font-bold text-[var(--color-text-soft)]">
              {newerHref && <Link href={newerHref}>Newer</Link>}
              {olderHref && <Link href={olderHref}>Older</Link>}
            </span>
          </div>
        )}
      </div>

      <div className="flex-none border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenResidue();
          }}
          className="flex w-full justify-between px-[22px] py-[11px] text-[12px] font-bold border-b border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-soft)]"
        >
          <span>Pick-shaped rejects, last 7 days</span>
          <b className="font-bold text-[var(--color-text-soft)] tabular-nums">
            {residueCount.toLocaleString("en-US")} ›
          </b>
        </button>
      </div>
    </div>
  );
}
