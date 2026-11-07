"use client";

import { useState, type ReactNode } from "react";
import { ReviewDetail } from "./ReviewDetail";
import { ReviewHeader } from "./ReviewHeader";
import { ReviewQueue } from "./ReviewQueue";
import { groupSizes, type ReviewRow } from "./reviewRow";

interface Props {
  rows: ReviewRow[];
  counts: { held: number; pickShaped: number; blocked: number | null; decided: number };
  paging: { offset: number; pageSize: number; total: number };
  newerHref: string | null;
  olderHref: string | null;
  sportLabel: string;
  /** Sport tabs and reason chips, rendered by the page between the header and the panes. */
  tabs: ReactNode;
  bucket?: ReactNode | null;
}

const noop = () => {};
const EMPTY: ReadonlySet<number> = new Set<number>();

/** Stub until the detail pane and bulk handlers land. */
export function ReviewWorkbench({ rows, counts, paging, newerHref, olderHref, sportLabel, tabs, bucket = null }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(rows[0]?.pick_id ?? null);
  const current = rows.find((r) => r.pick_id === selectedId) ?? null;
  const heldSiblings = current
    ? [current, ...rows.filter((r) => r.raw_id != null && r.raw_id === current.raw_id && r.pick_id !== current.pick_id)]
    : [];
  const heldIds = new Set(rows.map((r) => r.pick_id));
  const tracked = current ? current.raw_siblings.filter((s) => !heldIds.has(s.id)) : [];
  return (
    <>
      <ReviewHeader
        held={counts.held}
        pickShaped={counts.pickShaped}
        blocked={counts.blocked}
        decided={counts.decided}
        selectedCount={0}
        visibleCount={rows.length}
        pending={false}
        onApproveSelected={noop}
        onRejectSelected={noop}
        onClear={noop}
        onSelectAll={noop}
      />
      {tabs}
      <div className="flex-1 min-h-0 grid grid-cols-[470px_1fr]">
        <ReviewQueue
          rows={rows}
          selectedId={selectedId}
          selection={EMPTY}
          groupSizes={groupSizes(rows)}
          onSelect={setSelectedId}
          onSelectGroup={noop}
          paging={paging}
          newerHref={newerHref}
          olderHref={olderHref}
          bucket={bucket}
          residueCount={counts.pickShaped}
          onOpenResidue={noop}
          sportLabel={sportLabel}
        />
        <div className="min-h-0 overflow-y-auto p-6">
          {current && (
            <ReviewDetail
              key={current.pick_id}
              p={current}
              index={rows.findIndex((r) => r.pick_id === current.pick_id)}
              total={rows.length}
              markets={null}
              hint={undefined}
              pending={false}
              fixedKeys={[]}
              onPatch={async () => {}}
              onRetryMarkets={noop}
              heldSiblings={heldSiblings}
              tracked={tracked}
              groupSelected={false}
              onApprove={noop}
              onReject={noop}
              onApproveAll={noop}
              onRejectAll={noop}
              onSelectGroup={noop}
            />
          )}
        </div>
      </div>
    </>
  );
}
