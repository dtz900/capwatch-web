"use client";

import { useEffect, useState } from "react";
import { parseAdminSport } from "@/lib/admin-sports";
import { fetchMarketsAction, type MarketDef } from "./actions";
import { PickDetail } from "./PickDetail";
import { usePatchFlow } from "./usePatchFlow";
import { ActionStrip } from "./ActionStrip";
import { BucketList, type BucketData, type BucketKind } from "./BucketList";
import { effectiveStates, isStrayNcaabProp, primaryLabel } from "./fieldState";
import { useAuditKeys } from "./useAuditKeys";
import { useTerminalActions } from "./useTerminalActions";
import { siblingIdsFor } from "./siblings";
import { Queue, type FooterCounts } from "./Queue";
import { emptyQueueCopy, type QueueRow } from "./labels";

interface Props {
  problems: QueueRow[];
  footer: FooterCounts;
  recapDiffLabel: string;
  sportLabel: string;
  paging: { offset: number; pageSize: number; total: number };
  newerHref: string | null;
  olderHref: string | null;
  buckets: BucketData;
}

export function Workbench({ problems, footer, recapDiffLabel, sportLabel, paging, newerHref, olderHref, buckets }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(problems[0]?.pick_id ?? null);
  // The checkbox resets to checked whenever another pick is selected.
  const [applyOverride, setApplyOverride] = useState<{ id: number | null; value: boolean }>({ id: null, value: true });
  const applyToSiblings = applyOverride.id === selectedId ? applyOverride.value : true;
  const setApplyToSiblings = (value: boolean) => setApplyOverride({ id: selectedId, value });
  const flow = usePatchFlow(problems, applyToSiblings);
  const rows = flow.rows;
  const selected = rows.find((p) => p.pick_id === selectedId) ?? rows[0] ?? null;
  const [marketsBySport, setMarketsBySport] = useState<Record<string, MarketDef[] | "error">>({});
  const [marketsError, setMarketsError] = useState<Record<string, string>>({});

  const [view, setView] = useState<"queue" | BucketKind>("queue");
  // Escape remounts the detail so every editor (and its search box) closes.
  const [editorsEpoch, setEditorsEpoch] = useState(0);

  const sport = parseAdminSport(selected?.sport ?? "MLB");

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

  const marketList = Array.isArray(markets) ? markets : null;
  const fixedKeys = selected ? flow.fixed[selected.pick_id] ?? [] : [];
  const primary = selected
    ? primaryLabel(
        effectiveStates(selected, marketList, fixedKeys, flow.marketRecheck[selected.pick_id] ?? null),
        fixedKeys.length > 0,
      )
    : { label: "Regrade" as const, enabled: false, remaining: 0 };
  const stray = selected ? isStrayNcaabProp(selected) : false;

  const terminal = useTerminalActions({
    rows,
    selectedId: selected?.pick_id ?? null,
    setSelectedId,
    applyToSiblings,
    showAcked: buckets.showAcked,
    markets: marketList,
    fixed: flow.fixed,
    marketRecheck: flow.marketRecheck,
    setPending: flow.setPending,
    show: flow.show,
    removeRows: flow.removeRows,
  });

  const move = (delta: number) => {
    if (!selected || rows.length === 0) return;
    const i = rows.findIndex((r) => r.pick_id === selected.pick_id);
    setSelectedId(rows[Math.max(0, Math.min(rows.length - 1, i + delta))].pick_id);
  };
  useAuditKeys({
    enabled: !!selected && !flow.pending,
    onNext: () => move(1),
    onPrev: () => move(-1),
    onEnter: () => {
      if (!stray && primary.enabled) void terminal.regrade();
    },
    onGrade: (o) => {
      if (!stray) void terminal.grade(o);
    },
    onSkip: () => void terminal.skip(),
    onEscape: () => setEditorsEpoch((n) => n + 1),
  });

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
        bucket={view === "queue" ? null : <BucketList kind={view} data={buckets} onBack={() => setView("queue")} />}
        activeBucket={view === "queue" ? null : view}
        onOpenBucket={setView}
      />
      <div className="overflow-y-auto min-w-0 flex flex-col">
        {selected ? (
          <PickDetail
            key={`${selected.pick_id}:${editorsEpoch}`}
            p={selected}
            index={rows.findIndex((r) => r.pick_id === selected.pick_id)}
            total={rows.length}
            markets={markets}
            siblingIds={siblingIds}
            siblingRows={siblingRows}
            applyToSiblings={applyToSiblings}
            setApplyToSiblings={setApplyToSiblings}
            fixedKeys={fixedKeys}
            marketRecheck={flow.marketRecheck[selected.pick_id] ?? null}
            hint={flow.hints[selected.pick_id]}
            pending={flow.pending}
            onPatch={(patch, msg, propagate) => flow.handlePatch(selected.pick_id, patch, msg, propagate)}
          />
        ) : (
          <div className="px-8 py-[60px] text-[var(--color-text-muted)]">{emptyQueueCopy(sportLabel)}</div>
        )}
        {selected && (
          <ActionStrip
            primary={primary}
            pending={flow.pending}
            strayProp={stray}
            skipLabel={buckets.showAcked ? "Unskip" : "Skip"}
            onRegrade={() => void terminal.regrade()}
            onGrade={(o) => void terminal.grade(o)}
            onSkip={() => void terminal.skip()}
            onDelete={() => void terminal.remove()}
            message={terminal.message}
          />
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
