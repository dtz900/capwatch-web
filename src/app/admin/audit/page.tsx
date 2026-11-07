import { fetchAudit } from "@/lib/api";
import { parseAdminSport } from "@/lib/admin-sports";
import { fetchPickShapedFlags } from "./actions";
import { HeaderStrip } from "./HeaderStrip";
import { SportTabs } from "./SportTabs";
import { Workbench } from "./Workbench";
import type { BucketRow, QueueRow, UngradedFinalView } from "./labels";
import { REASON_LABEL } from "./labels";

interface PageProps {
  searchParams: Promise<{
    reason?: string;
    capper?: string;
    kind?: "void" | "ungraded";
    pick_id?: string;
    offset?: string;
    sort?: "oldest" | "newest";
    sport?: string;
    show_acked?: string;
  }>;
}

export const metadata = {
  title: "Audit · TailSlips Admin",
  robots: { index: false, follow: false },
};

// Audit endpoint scans every pick to compute summary + by_reason buckets and
// gets slower as the dataset grows. As of 2026-05-01 it sits at ~4.5s
// locally (2957 picks); the Vercel default 10s timeout was tripping
// intermittently with cold starts and network. Bump to 30s.
export const maxDuration = 30;

const PAGE_SIZE = 50;

// Reasons that live in their own collapsed sections (pending / settled),
// not the actionable failure-reason filter row.
const HIDDEN_REASON_CHIPS = new Set([
  "game_pending",
  "player_did_not_play",
  "data_gap",
]);

/* Resolved once on the server at request time, like the rest of the admin
   pages (see PR #150: dates are formatted server-side and passed down as
   strings so the client never re-derives them and risks a hydration
   mismatch). A duration-since-now string carries no timezone, so there is
   nothing Pacific-specific to resolve here, just the "now" to diff against. */
function formatAgo(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const offset = Math.max(0, parseInt(sp.offset ?? "0", 10) || 0);
  const reason = (sp.reason ?? "").trim() || undefined;
  const capper = (sp.capper ?? "").trim() || undefined;
  const kind = sp.kind === "void" || sp.kind === "ungraded" ? sp.kind : undefined;
  const pickIdParsed = sp.pick_id ? parseInt(sp.pick_id, 10) : NaN;
  const pickIdLookup = Number.isFinite(pickIdParsed) && pickIdParsed > 0 ? pickIdParsed : undefined;
  // Newest-first by default: in the ack model the queue is the un-acked
  // set, so the freshest un-triaged problems are what matter.
  const sort: "oldest" | "newest" = sp.sort === "oldest" ? "oldest" : "newest";
  const sport = parseAdminSport(sp.sport);
  const showAcked = sp.show_acked === "true";

  const pickShapedFlags = await fetchPickShapedFlags();

  const data = await fetchAudit({
    reason,
    capper,
    kind,
    pick_id: pickIdLookup,
    sort,
    sport,
    show_acked: showAcked,
    limit: PAGE_SIZE,
    offset,
  });

  const recapDiff = data.recap_diff_last_run ?? null;
  const recapDiffLabel = recapDiff
    ? `Recap diff last ran ${formatAgo(recapDiff.ran_at)} (${recapDiff.recaps_examined} recaps, ${recapDiff.flagged_count} flagged)`
    : "Recap diff has not run yet";

  const buildHref = (
    overrides: Partial<{
      reason: string;
      capper: string;
      kind: string;
      offset: string;
      sort: string;
      sport: string;
      show_acked: string;
    }>,
  ) => {
    const params = new URLSearchParams();
    const r = overrides.reason ?? reason ?? "";
    const c = overrides.capper ?? capper ?? "";
    const k = overrides.kind ?? kind ?? "";
    const o = overrides.offset ?? "";
    // Newest is the default now, so only encode "oldest".
    const s = overrides.sort ?? (sort === "oldest" ? "oldest" : "");
    const spo = overrides.sport ?? sport ?? "";
    const sa = overrides.show_acked ?? (showAcked ? "true" : "");
    if (r) params.set("reason", r);
    if (c) params.set("capper", c);
    if (k) params.set("kind", k);
    if (o) params.set("offset", o);
    if (s) params.set("sort", s);
    if (spo) params.set("sport", spo);
    if (sa) params.set("show_acked", sa);
    const qs = params.toString();
    return qs ? `/admin/audit?${qs}` : "/admin/audit";
  };

  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
  const rows: QueueRow[] = data.problems.map((p) => ({
    ...p,
    posted_label: p.posted_at ? fmtDay(p.posted_at) : null,
    game_label: p.game_date
      ? new Date(p.game_date + "T12:00:00Z").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })
      : null,
  }));

  const toBucketRow = (p: (typeof data.problems)[number]): BucketRow => ({
    pick_id: p.pick_id,
    date: p.posted_at ? fmtDay(p.posted_at) : null,
    capper: p.capper_display_name ?? p.capper_handle ?? "Unknown",
    selection: p.selection ?? p.market ?? "Untitled pick",
    reason: REASON_LABEL[p.reason] ?? p.reason,
  });
  const ungradedFinalViews: UngradedFinalView[] = (data.ungraded_final?.rows ?? []).map((r) => ({
    pick_id: r.pick_id,
    capper_handle: r.capper_handle,
    selection: r.selection,
    stat_name: r.stat_name,
    sport: r.sport,
    game_id: r.game_id,
    finalSince: formatAgo(r.final_at),
    reason: r.reason,
  }));

  const hasNewer = offset > 0;
  const hasOlder = offset + data.problems.length < data.total_problems;

  return (
    <main className="h-[calc(100vh-65px)] flex flex-col overflow-hidden">
      {data.error && (
        <div className="flex-none border-b border-[var(--color-border)] px-6 py-2 text-[12px] font-semibold text-[var(--color-neg)]">
          Audit endpoint error, {data.error.class}: {data.error.message}. Reload to retry.
        </div>
      )}
      <HeaderStrip
        needsYou={data.summary.needs_you ?? data.total_problems}
        settled={data.settled_total ?? 0}
        pending={data.pending_total ?? 0}
        graded={data.summary.graded}
        pickIdValue={pickIdLookup}
      />
      <SportTabs
        sport={sport}
        by_sport={data.by_sport}
        by_reason={data.by_reason}
        total={data.summary.needs_you ?? data.total_problems}
        reason={reason}
        sort={sort}
        hiddenReasons={HIDDEN_REASON_CHIPS}
        buildHref={buildHref}
      />
      <Workbench
        problems={rows}
        footer={{
          settled: data.settled_total ?? 0,
          pending: data.pending_total ?? 0,
          triaged: data.summary.acked ?? 0,
          ungradedFinal: data.ungraded_final?.total ?? 0,
          pickShaped: pickShapedFlags.length,
        }}
        buckets={{
          settled: (data.settled ?? []).map(toBucketRow),
          pending: (data.pending ?? []).map(toBucketRow),
          ungradedFinal: ungradedFinalViews,
          flags: pickShapedFlags,
          capper: capper ?? null,
          showAcked,
          triagedHref: buildHref({ show_acked: "true" }),
          counts: {
            settled: data.settled_total ?? 0,
            pending: data.pending_total ?? 0,
            ungradedFinal: data.ungraded_final?.total ?? 0,
          },
        }}
        pickIdValue={pickIdLookup}
        recapDiffLabel={recapDiffLabel}
        sportLabel={sport ?? "any sport"}
        paging={{ offset, pageSize: PAGE_SIZE, total: data.total_problems }}
        newerHref={hasNewer ? buildHref({ offset: String(Math.max(0, offset - PAGE_SIZE)) }) : null}
        olderHref={hasOlder ? buildHref({ offset: String(offset + PAGE_SIZE) }) : null}
      />
    </main>
  );
}
