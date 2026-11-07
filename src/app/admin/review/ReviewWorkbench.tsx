"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { RejectedPickShaped } from "@/lib/api";
import { parseAdminSport } from "@/lib/admin-sports";
import { fetchMarketsAction, type MarketDef } from "../audit/actions";
import { usePatchFlow } from "../audit/usePatchFlow";
import { ResidueList } from "./ResidueList";
import { ReviewActionStrip } from "./ReviewActionStrip";
import { ReviewDetail } from "./ReviewDetail";
import { ReviewHeader } from "./ReviewHeader";
import { ReviewQueue } from "./ReviewQueue";
import { groupSizes, type ReviewRow } from "./reviewRow";
import { useReviewActions } from "./useReviewActions";
import { useReviewKeys } from "./useReviewKeys";

interface Props {
  rows: ReviewRow[];
  counts: { held: number; pickShaped: number; blocked: number | null; decided: number };
  paging: { offset: number; pageSize: number; total: number };
  newerHref: string | null;
  olderHref: string | null;
  sportLabel: string;
  /** Sport tabs and reason chips, rendered by the page between the header and the panes. */
  tabs: ReactNode;
  residue: RejectedPickShaped[];
}

export function ReviewWorkbench({ rows: initial, counts, paging, newerHref, olderHref, sportLabel, tabs, residue }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(initial[0]?.pick_id ?? null);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [view, setView] = useState<"queue" | "residue">("queue");
  // Escape remounts the detail so every editor (and its search box) closes.
  const [editorsEpoch, setEditorsEpoch] = useState(0);
  const flow = usePatchFlow(initial, false, selectedId);
  const rows = flow.rows as ReviewRow[];
  const current = rows.find((r) => r.pick_id === selectedId) ?? rows[0] ?? null;
  const currentId = current?.pick_id ?? null;

  const [marketsBySport, setMarketsBySport] = useState<Record<string, MarketDef[] | "error">>({});
  const [marketsError, setMarketsError] = useState<Record<string, string>>({});
  const sport = parseAdminSport(current?.sport ?? "MLB");
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
  const markets = !sport
    ? "Unknown sport"
    : loaded === undefined
      ? null
      : loaded === "error"
        ? (marketsError[sport as string] ?? "unknown error")
        : loaded;
  const retryMarkets = () => {
    if (sport) setMarketsBySport((m) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== sport)));
  };

  const actions = useReviewActions({
    rows,
    selectedId: currentId,
    setSelectedId,
    selection,
    setSelection,
    setPending: flow.setPending,
    show: flow.show,
    removeRows: flow.removeRows,
    refresh: router.refresh,
  });

  const group = (rawId: number | null) => (rawId == null ? [] : rows.filter((r) => r.raw_id === rawId));
  const heldSiblings = current ? [current, ...group(current.raw_id).filter((r) => r.pick_id !== current.pick_id)] : [];
  const heldIds = new Set(rows.map((r) => r.pick_id));
  const tracked = current ? current.raw_siblings.filter((s) => !heldIds.has(s.id)) : [];

  const toggle = (ids: number[], on: boolean) =>
    setSelection((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  const selectGroup = (rawId: number, on: boolean) =>
    toggle(
      group(rawId).map((r) => r.pick_id),
      on,
    );
  const toggleCurrent = () => current && toggle([current.pick_id], !selection.has(current.pick_id));
  const groupSelected = heldSiblings.length > 0 && heldSiblings.every((r) => selection.has(r.pick_id));
  const move = (delta: number) => {
    if (!current || rows.length === 0) return;
    const i = rows.findIndex((r) => r.pick_id === current.pick_id);
    setSelectedId(rows[Math.max(0, Math.min(rows.length - 1, i + delta))].pick_id);
  };
  const busy = flow.pending;

  useReviewKeys({
    enabled: !!current && !busy && view === "queue",
    onNext: () => move(1),
    onPrev: () => move(-1),
    onApprove: () => {
      if (!current) return false;
      void actions.approve(current.pick_id);
      return true;
    },
    onReject: () => current && void actions.reject(current.pick_id),
    onSelect: toggleCurrent,
    onSelectTweet: () => current?.raw_id != null && selectGroup(current.raw_id, !groupSelected),
    onEscape: () => setEditorsEpoch((n) => n + 1),
  });

  const picked = [...selection].filter((id) => heldIds.has(id));
  const heldIdList = heldSiblings.map((r) => r.pick_id);

  return (
    <>
      <ReviewHeader
        held={counts.held}
        pickShaped={counts.pickShaped}
        blocked={counts.blocked}
        decided={counts.decided}
        selectedCount={picked.length}
        visibleCount={rows.length}
        pending={busy}
        onApproveSelected={() => void actions.approveMany(picked)}
        onRejectSelected={() => void actions.rejectMany(picked)}
        onClear={() => setSelection(new Set())}
        onSelectAll={() => setSelection(new Set(rows.map((r) => r.pick_id)))}
      />
      {tabs}
      <div className="flex-1 min-h-0 grid grid-cols-[470px_1fr]">
        <ReviewQueue
          rows={rows}
          selectedId={currentId}
          selection={selection}
          groupSizes={groupSizes(rows)}
          onSelect={setSelectedId}
          onSelectGroup={selectGroup}
          paging={paging}
          newerHref={newerHref}
          olderHref={olderHref}
          bucket={view === "residue" ? <ResidueList items={residue} onBack={() => setView("queue")} /> : null}
          residueCount={counts.pickShaped}
          onOpenResidue={() => setView("residue")}
          sportLabel={sportLabel}
        />
        <div className="min-h-0 overflow-y-auto min-w-0 flex flex-col">
          {current && (
            <>
              <ReviewDetail
                key={`${current.pick_id}:${editorsEpoch}`}
                p={current}
                index={rows.findIndex((r) => r.pick_id === current.pick_id)}
                total={rows.length}
                markets={markets}
                hint={flow.hints[current.pick_id]}
                pending={busy}
                fixedKeys={flow.fixed[current.pick_id] ?? []}
                onPatch={(patch, msg, propagate, hint) => flow.handlePatch(current.pick_id, patch, msg, propagate, hint)}
                onRetryMarkets={retryMarkets}
                heldSiblings={heldSiblings}
                tracked={tracked}
                groupSelected={groupSelected}
                onApprove={(id) => void actions.approve(id)}
                onReject={(id) => void actions.reject(id)}
                onApproveAll={() => void actions.approveMany(heldIdList, "from one tweet")}
                onRejectAll={() => void actions.rejectMany(heldIdList, "from one tweet")}
                onSelectGroup={(on) => current.raw_id != null && selectGroup(current.raw_id, on)}
              />
              <ReviewActionStrip
                canApprove={actions.canApprove(current)}
                started={current.started_minutes != null}
                pending={busy}
                selected={selection.has(current.pick_id)}
                onApprove={() => void actions.approve(current.pick_id)}
                onReject={() => void actions.reject(current.pick_id)}
                onSkip={() => move(1)}
                onToggleSelect={toggleCurrent}
                message={actions.message}
              />
            </>
          )}
        </div>
      </div>
      {flow.toast && (
        <div
          role="status"
          className="fixed bottom-[76px] left-1/2 -translate-x-1/2 bg-[var(--color-text)] text-[#0a0a0c] font-extrabold px-4 py-[9px] rounded-lg text-[12.5px]"
        >
          {flow.toast}
        </div>
      )}
    </>
  );
}
