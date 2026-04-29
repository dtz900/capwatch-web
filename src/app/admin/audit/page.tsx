import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";
import { fetchAudit, type AuditProblem } from "@/lib/api";
import { FixPanel } from "./FixPanel";

interface PageProps {
  searchParams: Promise<{
    reason?: string;
    capper?: string;
    kind?: "void" | "ungraded";
    offset?: string;
    sort?: "oldest" | "newest";
  }>;
}

export const metadata = {
  title: "Audit · Capwatch Admin",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;

const REASON_LABEL: Record<string, string> = {
  market_unhandled: "Market not in grader",
  missing_player_id: "Player not resolved",
  missing_line: "Line missing",
  missing_game_id: "Game not resolved",
  game_pending: "Game pending",
  no_grade_row: "Grader hasn't run",
  boxscore_or_data_gap: "Player not in boxscore",
};

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const offset = Math.max(0, parseInt(sp.offset ?? "0", 10) || 0);
  const reason = (sp.reason ?? "").trim() || undefined;
  const capper = (sp.capper ?? "").trim() || undefined;
  const kind = sp.kind === "void" || sp.kind === "ungraded" ? sp.kind : undefined;
  const sort: "oldest" | "newest" = sp.sort === "newest" ? "newest" : "oldest";

  const data = await fetchAudit({
    reason,
    capper,
    kind,
    sort,
    limit: PAGE_SIZE,
    offset,
  });

  const showingFrom = offset + 1;
  const showingTo = Math.min(offset + data.problems.length, data.total_problems);

  const buildHref = (
    overrides: Partial<{ reason: string; capper: string; kind: string; offset: string; sort: string }>,
  ) => {
    const params = new URLSearchParams();
    const r = overrides.reason ?? reason ?? "";
    const c = overrides.capper ?? capper ?? "";
    const k = overrides.kind ?? kind ?? "";
    const o = overrides.offset ?? "";
    const s = overrides.sort ?? (sort === "oldest" ? "" : sort);
    if (r) params.set("reason", r);
    if (c) params.set("capper", c);
    if (k) params.set("kind", k);
    if (o) params.set("offset", o);
    if (s) params.set("sort", s);
    const qs = params.toString();
    return qs ? `/admin/audit?${qs}` : "/admin/audit";
  };

  return (
    <>
      <TopNav />
      <main className="max-w-[1240px] mx-auto px-7 pb-16">
        <header className="pt-10 pb-7">
          <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-bold mb-2">
            Admin · pipeline audit
          </div>
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none">
            Picks needing review
          </h1>
          <p className="text-[13px] text-[var(--color-text-soft)] font-medium mt-2">
            Real-time. Every pick that didn't grade cleanly, with the specific
            failure reason. {data.total_problems} item{data.total_problems === 1 ? "" : "s"} match the current filters.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Total picks" value={data.summary.total} />
          <Stat label="Graded W/L/P" value={data.summary.graded} tone="pos" />
          <Stat label="Voided" value={data.summary.void} tone="neg" />
          <Stat label="Ungraded" value={data.summary.ungraded} tone="neutral" />
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4 mb-6">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-3">
            Failure reasons
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref({ reason: "" })}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                !reason
                  ? "bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.15)] text-[var(--color-text)]"
                  : "border-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
              }`}
            >
              All ({Object.values(data.by_reason).reduce((a, b) => a + b, 0)})
            </Link>
            {Object.entries(data.by_reason)
              .sort((a, b) => b[1] - a[1])
              .map(([r, n]) => (
                <Link
                  key={r}
                  href={buildHref({ reason: r })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                    reason === r
                      ? "bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.15)] text-[var(--color-text)]"
                      : "border-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {REASON_LABEL[r] ?? r} ({n})
                </Link>
              ))}
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold">
              Kind
            </span>
            {(["", "void", "ungraded"] as const).map((k) => (
              <Link
                key={k || "all"}
                href={buildHref({ kind: k })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                  (kind ?? "") === k
                    ? "bg-[rgba(255,255,255,0.08)] text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {k || "All"}
              </Link>
            ))}
            <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold ml-3">
              Sort
            </span>
            {(["oldest", "newest"] as const).map((s) => (
              <Link
                key={s}
                href={buildHref({ sort: s })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                  sort === s
                    ? "bg-[rgba(255,255,255,0.08)] text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {s === "oldest" ? "Oldest first" : "Newest first"}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div
            className="grid grid-cols-[80px_120px_140px_1fr_60px_30px] gap-3 items-center px-4 py-2.5
                          bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-border)]
                          text-[10px] uppercase tracking-[0.14em] font-bold text-[var(--color-text-muted)]"
          >
            <div>Date</div>
            <div>Capper</div>
            <div>Reason</div>
            <div>Pick</div>
            <div className="text-right">Market</div>
            <div />
          </div>
          {data.problems.length === 0 ? (
            <div className="px-6 py-10 text-center text-[13px] text-[var(--color-text-muted)] italic">
              Nothing matches these filters.
            </div>
          ) : (
            data.problems.map((p) => <ProblemRow key={p.pick_id} p={p} />)
          )}
          <div
            className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]
                          text-[11px] text-[var(--color-text-muted)] font-medium"
          >
            <div>
              Showing {showingFrom}-{showingTo} of {data.total_problems}
            </div>
            <div className="flex items-center gap-2">
              {offset > 0 && (
                <Link
                  href={buildHref({ offset: String(Math.max(0, offset - PAGE_SIZE)) })}
                  className="px-3 py-1 rounded-md bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]
                             text-[var(--color-text-soft)] text-[11px] font-bold"
                >
                  ← Newer
                </Link>
              )}
              {offset + data.problems.length < data.total_problems && (
                <Link
                  href={buildHref({ offset: String(offset + PAGE_SIZE) })}
                  className="px-3 py-1 rounded-md bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]
                             text-[var(--color-text-soft)] text-[11px] font-bold"
                >
                  Older →
                </Link>
              )}
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between py-7 pb-2 mt-6 text-xs text-[var(--color-text-muted)] font-medium">
          <div>Live data. No cache. Every refresh hits the audit endpoint.</div>
        </footer>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "pos" | "neg" | "neutral";
}) {
  const color =
    tone === "pos"
      ? "text-[var(--color-pos)]"
      : tone === "neg"
        ? "text-[var(--color-neg)]"
        : "text-[var(--color-text)]";
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold mb-1.5">
        {label}
      </div>
      <div className={`font-extrabold tabular-nums leading-none tracking-[-0.02em] text-[22px] ${color}`}>
        {value}
      </div>
    </div>
  );
}

function ProblemRow({ p }: { p: AuditProblem }) {
  const date = p.posted_at
    ? new Date(p.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";
  const reasonLabel = REASON_LABEL[p.reason] ?? p.reason;
  const reasonColor =
    p.kind === "void"
      ? "bg-[var(--color-neg-soft)] text-[var(--color-neg)]"
      : "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)]";
  return (
    <div className="border-b border-[rgba(255,255,255,0.03)] last:border-b-0 px-4 py-3">
      <div className="grid grid-cols-[80px_120px_140px_1fr_60px_50px] gap-3 items-start text-[12px]">
        <div className="text-[var(--color-text-muted)] font-medium tabular-nums">{date}</div>
        <div className="min-w-0">
          <Link
            href={p.capper_handle ? `/cappers/${p.capper_handle}` : "#"}
            className="font-semibold truncate text-[var(--color-text)] hover:underline block"
          >
            {p.capper_display_name ?? p.capper_handle ?? "—"}
          </Link>
          <div className="text-[10px] text-[var(--color-text-muted)]">
            @{p.capper_handle ?? "—"}
          </div>
        </div>
        <div>
          <span
            className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-[0.10em] ${reasonColor}`}
          >
            {reasonLabel}
          </span>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
            pid={p.pick_id}
            {p.parlay_id != null && <span className="ml-1">· parlay {p.parlay_id}</span>}
          </div>
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-[var(--color-text)] truncate">
            {p.selection ?? p.market ?? "—"}
          </div>
          {p.tweet_text && (
            <div className="text-[10px] text-[var(--color-text-muted)] mt-1 leading-snug line-clamp-2">
              {p.tweet_text}
            </div>
          )}
        </div>
        <div className="text-right text-[var(--color-text-soft)] font-medium">
          {p.market ?? "—"}
        </div>
        <div className="text-right flex flex-col gap-1.5 items-end">
          {p.tweet_url && (
            <a
              href={p.tweet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[12px] font-bold"
              aria-label="Open tweet"
            >
              ↗
            </a>
          )}
        </div>
      </div>
      <FixPanel
        pickId={p.pick_id}
        market={p.market}
        selection={p.selection}
        line={p.line}
        oddsTaken={p.odds_taken}
        units={p.units}
        playerId={p.player_id}
        gameId={p.game_id}
        postedAt={p.posted_at}
      />
    </div>
  );
}
