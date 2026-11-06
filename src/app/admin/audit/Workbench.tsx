"use client";

import { useEffect, useState } from "react";
import { parseAdminSport } from "@/lib/admin-sports";
import { fetchMarketsAction, type MarketDef } from "./actions";
import { PickDetail } from "./PickDetail";
import { siblingIdsFor } from "./siblings";
import { Queue, type FooterCounts } from "./Queue";
import type { QueueRow } from "./labels";

interface Props {
  problems: QueueRow[];
  footer: FooterCounts;
  recapDiffLabel: string;
  sportLabel: string;
  paging: { offset: number; pageSize: number; total: number };
  newerHref: string | null;
  olderHref: string | null;
}

export function Workbench({ problems, footer, recapDiffLabel, sportLabel, paging, newerHref, olderHref }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(problems[0]?.pick_id ?? null);
  const selected = problems.find((p) => p.pick_id === selectedId) ?? problems[0] ?? null;
  const [applyToSiblings, setApplyToSiblings] = useState(true);
  const [marketsBySport, setMarketsBySport] = useState<Record<string, MarketDef[] | "error">>({});
  const [marketsError, setMarketsError] = useState<Record<string, string>>({});

  const selectedPickId = selected?.pick_id ?? null;
  const sport = parseAdminSport(selected?.sport ?? "MLB");

  useEffect(() => {
    setApplyToSiblings(true);
  }, [selectedPickId]);

  useEffect(() => {
    if (!sport || marketsBySport[sport] !== undefined) return;
    let live = true;
    fetchMarketsAction(sport).then((r) => {
      if (!live) return;
      if (r.ok) setMarketsBySport((m) => ({ ...m, [sport]: r.results }));
      else {
        setMarketsBySport((m) => ({ ...m, [sport]: "error" }));
        setMarketsError((m) => ({ ...m, [sport]: r.error }));
      }
    });
    return () => {
      live = false;
    };
  }, [sport, marketsBySport]);

  const loaded = sport ? marketsBySport[sport] : undefined;
  const markets = !sport ? "Unknown sport" : loaded === undefined ? null : loaded === "error" ? marketsError[sport as string] ?? "unknown error" : loaded;
  const siblingIds = selected ? siblingIdsFor(problems, selected) : [];
  const siblingRows = problems.filter((r) => siblingIds.includes(r.pick_id));

  return (
    <div className="flex-1 min-h-0 grid grid-cols-[470px_1fr]">
      <Queue
        rows={problems}
        selectedId={selected?.pick_id ?? null}
        onSelect={setSelectedId}
        sportLabel={sportLabel}
        footer={footer}
        recapDiffLabel={recapDiffLabel}
        paging={paging}
        newerHref={newerHref}
        olderHref={olderHref}
      />
      <div className="overflow-y-auto min-w-0">
        {selected ? (
          <PickDetail
            key={selected.pick_id}
            p={selected}
            index={problems.findIndex((r) => r.pick_id === selected.pick_id)}
            total={problems.length}
            markets={markets}
            siblingIds={siblingIds}
            siblingRows={siblingRows}
            applyToSiblings={applyToSiblings}
            setApplyToSiblings={setApplyToSiblings}
            onPatched={() => {}}
          />
        ) : (
          <div className="px-8 py-[60px] text-[var(--color-text-muted)]">Queue clear.</div>
        )}
      </div>
    </div>
  );
}
