"use client";

import { useEffect, useRef, useState } from "react";
import { parseAdminSport } from "@/lib/admin-sports";
import { fetchMarketsAction, type MarketDef } from "./actions";
import { PickDetail } from "./PickDetail";
import { usePatchFlow } from "./usePatchFlow";
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
  const [applyToSiblings, setApplyToSiblings] = useState(true);
  const flow = usePatchFlow(
    problems,
    (id) => {
      const row = flowRowsRef.current.find((r) => r.pick_id === id);
      return row ? siblingIdsFor(flowRowsRef.current, row) : [];
    },
    applyToSiblings,
  );
  const rows = flow.rows;
  const flowRowsRef = useRef(rows);
  flowRowsRef.current = rows;
  const selected = rows.find((p) => p.pick_id === selectedId) ?? rows[0] ?? null;
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
  const siblingIds = selected ? siblingIdsFor(rows, selected) : [];
  const siblingRows = rows.filter((r) => siblingIds.includes(r.pick_id));

  return (
    <div className="flex-1 min-h-0 grid grid-cols-[470px_1fr]">
      <Queue
        rows={rows}
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
            index={rows.findIndex((r) => r.pick_id === selected.pick_id)}
            total={rows.length}
            markets={markets}
            siblingIds={siblingIds}
            siblingRows={siblingRows}
            applyToSiblings={applyToSiblings}
            setApplyToSiblings={setApplyToSiblings}
            fixedKeys={flow.fixed[selected.pick_id] ?? []}
            marketRecheck={flow.marketRecheck[selected.pick_id] ?? null}
            hint={flow.hints[selected.pick_id]}
            onHint={(h) => flow.setHint(selected.pick_id, h)}
            pending={flow.pending}
            onPatch={(patch, msg, propagate) => flow.handlePatch(selected.pick_id, patch, msg, propagate)}
          />
        ) : (
          <div className="px-8 py-[60px] text-[var(--color-text-muted)]">Queue clear.</div>
        )}
      </div>
      {flow.toast && (
        <div
          role="status"
          className="fixed bottom-[76px] left-1/2 -translate-x-1/2 bg-[var(--color-text)] text-[#0a0a0c] font-extrabold px-4 py-[9px] rounded-lg text-[12.5px]"
        >
          {flow.toast}
        </div>
      )}
    </div>
  );
}
