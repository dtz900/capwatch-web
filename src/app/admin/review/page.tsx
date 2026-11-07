import { fetchReviewQueue } from "@/lib/api";
import { parseAdminSport } from "@/lib/admin-sports";
import { SportTabs } from "../audit/SportTabs";
import { REVIEW_REASON_LABEL } from "./reviewLabels";
import { toReviewRow } from "./reviewRow";
import { ReviewWorkbench } from "./ReviewWorkbench";

interface PageProps {
  searchParams: Promise<{
    sport?: string;
    reason?: string;
    sort?: string;
    offset?: string;
  }>;
}

export const metadata = {
  title: "Review queue · TailSlips Admin",
  robots: { index: false, follow: false },
};

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const NO_HIDDEN_REASONS = new Set<string>();

export default async function AdminReviewPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const offset = Math.max(0, parseInt(sp.offset ?? "0", 10) || 0);
  const reason = (sp.reason ?? "").trim() || undefined;
  const sort: "oldest" | "newest" = sp.sort === "oldest" ? "oldest" : "newest";
  const sport = parseAdminSport(sp.sport);

  const raw = await fetchReviewQueue({ limit: PAGE_SIZE, offset, sport, reason, sort });
  // Tolerate an API that predates the workbench fields (deploy order): empty maps and zero counts.
  const data = {
    ...raw,
    by_sport: raw.by_sport ?? {},
    by_reason: raw.by_reason ?? {},
    raw_siblings: raw.raw_siblings ?? {},
    decided_today: raw.decided_today ?? 0,
  };

  const now = new Date();
  const rows = data.items.map((it) =>
    toReviewRow(it, it.raw_id != null ? (data.raw_siblings[String(it.raw_id)] ?? []) : [], now),
  );

  const buildHref = (
    overrides: Partial<{ reason: string; offset: string; sort: string; sport: string }>,
  ) => {
    const params = new URLSearchParams();
    const r = overrides.reason ?? reason ?? "";
    const o = overrides.offset ?? "";
    // Newest is the default, so only encode "oldest".
    const s = overrides.sort ?? (sort === "oldest" ? "oldest" : "");
    const spo = overrides.sport ?? sport ?? "";
    if (r) params.set("reason", r);
    if (o) params.set("offset", o);
    if (s) params.set("sort", s);
    if (spo) params.set("sport", spo);
    const qs = params.toString();
    return qs ? `/admin/review?${qs}` : "/admin/review";
  };

  const bySportTotal = Object.values(data.by_sport).reduce((a, b) => a + b, 0);
  const allTotal = bySportTotal || data.total;
  const hasNewer = offset > 0;
  const hasOlder = offset + data.items.length < data.total;

  return (
    <main className="h-[calc(100vh-65px)] flex flex-col">
      <ReviewWorkbench
        rows={rows}
        counts={{
          held: allTotal,
          pickShaped: (data.rejected_pick_shaped ?? []).length,
          blocked: data.blocked_protected_lookup,
          decided: data.decided_today,
        }}
        tabs={
          <SportTabs
            sport={sport}
            by_sport={data.by_sport}
            by_reason={data.by_reason}
            total={allTotal}
            reason={reason}
            sort={sort}
            hiddenReasons={NO_HIDDEN_REASONS}
            buildHref={buildHref}
            reasonLabel={REVIEW_REASON_LABEL}
            reasonTitle="Held because"
          />
        }
        paging={{ offset, pageSize: PAGE_SIZE, total: data.total }}
        newerHref={hasNewer ? buildHref({ offset: String(Math.max(0, offset - PAGE_SIZE)) }) : null}
        olderHref={hasOlder ? buildHref({ offset: String(offset + PAGE_SIZE) }) : null}
        sportLabel={sport ?? "any sport"}
      />
    </main>
  );
}
