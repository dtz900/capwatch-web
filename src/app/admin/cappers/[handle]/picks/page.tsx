import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import { fetchCapperProfile } from "@/lib/api";
import { formatBetDescriptor } from "@/lib/markets";
import { formatUnitsSmart } from "@/lib/formatters";
import type { HistoryPick } from "@/lib/types";

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ offset?: string }>;
}

export const metadata = {
  title: "Capper picks · TailSlips Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function outcomeTone(outcome: string | null): string {
  if (outcome === "W") return "text-[var(--color-pos)]";
  if (outcome === "L") return "text-[var(--color-neg)]";
  if (outcome === "P") return "text-[var(--color-text-muted)]";
  return "text-[var(--color-text-soft)]";
}

export default async function AdminCapperPicksPage({ params, searchParams }: PageProps) {
  const { handle } = await params;
  const sp = await searchParams;
  const offset = Math.max(0, parseInt(sp.offset ?? "0", 10) || 0);

  let profile;
  try {
    profile = await fetchCapperProfile(handle, {
      history_limit: PAGE_SIZE,
      history_offset: offset,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "not_found") notFound();
    return (
      <>
        <TopNav />
        <main className="max-w-[1240px] mx-auto px-7 pt-12 pb-16">
          <h1 className="text-[24px] font-extrabold mb-2">Admin · @{handle}</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Capper profile is temporarily unavailable. Refresh in a moment.
          </p>
        </main>
      </>
    );
  }

  const showingFrom = offset + 1;
  const showingTo = Math.min(offset + profile.history.length, profile.history_total);

  const buildHref = (newOffset: number) => {
    if (newOffset <= 0) return `/admin/cappers/${encodeURIComponent(handle)}/picks`;
    return `/admin/cappers/${encodeURIComponent(handle)}/picks?offset=${newOffset}`;
  };

  return (
    <>
      <TopNav />
      <main className="max-w-[1240px] mx-auto px-7 pb-16">
        <header className="pt-10 pb-5">
          <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-bold mb-2">
            Admin · capper picks
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] leading-none">
              {profile.capper.display_name ?? handle}
            </h1>
            <span className="text-[14px] text-[var(--color-text-muted)] font-medium">
              @{handle}
            </span>
            <Link
              href={`/cappers/${encodeURIComponent(handle)}`}
              className="ml-auto text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-bold"
            >
              View public profile →
            </Link>
          </div>
          <p className="text-[12px] text-[var(--color-text-soft)] font-medium mt-2">
            Every pick with its pick_id and a one-click link to edit it in the audit FixPanel.
          </p>
        </header>

        {profile.pending && profile.pending.length > 0 && (
          <section className="mb-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-2">
              Pending ({profile.pending.length})
            </div>
            <PicksTable rows={profile.pending} />
          </section>
        )}

        <section>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-2">
            Graded history
          </div>
          {profile.history.length === 0 ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-10 text-center text-[13px] text-[var(--color-text-muted)] italic">
              No graded picks yet.
            </div>
          ) : (
            <PicksTable rows={profile.history} />
          )}
        </section>

        <div className="flex items-center justify-between px-4 py-3 mt-4 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] font-medium">
          <div>
            Showing {showingFrom}-{showingTo} of {profile.history_total}
          </div>
          <div className="flex items-center gap-2">
            {offset > 0 && (
              <Link
                href={buildHref(Math.max(0, offset - PAGE_SIZE))}
                className="px-3 py-1 rounded-md bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[var(--color-text-soft)] text-[11px] font-bold"
              >
                ← Newer
              </Link>
            )}
            {offset + profile.history.length < profile.history_total && (
              <Link
                href={buildHref(offset + PAGE_SIZE)}
                className="px-3 py-1 rounded-md bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[var(--color-text-soft)] text-[11px] font-bold"
              >
                Older →
              </Link>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function PicksTable({ rows }: { rows: HistoryPick[] }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
      <div className="hidden sm:grid grid-cols-[80px_60px_minmax(220px,1fr)_60px_70px_70px_90px_120px] gap-3 items-center px-4 py-2.5 border-b border-[var(--color-border)] text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--color-text-muted)]">
        <div>Date</div>
        <div className="text-center">Outcome</div>
        <div>Selection</div>
        <div className="text-right">Line</div>
        <div className="text-right">Odds</div>
        <div className="text-right">Profit</div>
        <div className="text-right tabular-nums">pick_id</div>
        <div className="text-right">Action</div>
      </div>
      {rows.map((p, i) => (
        <PicksRow key={`${p.id}-${i}`} pick={p} isLast={i === rows.length - 1} />
      ))}
    </div>
  );
}

function PicksRow({ pick, isLast }: { pick: HistoryPick; isLast: boolean }) {
  const oddsText =
    pick.odds_taken == null
      ? ""
      : pick.odds_taken > 0
        ? `+${pick.odds_taken}`
        : String(pick.odds_taken);

  return (
    <div
      className={`grid grid-cols-[80px_60px_minmax(220px,1fr)_60px_70px_70px_90px_120px] gap-3 items-center
                  px-4 py-2.5 text-[12px] hover:bg-[rgba(255,255,255,0.02)]
                  ${isLast ? "" : "border-b border-[rgba(255,255,255,0.035)]"}`}
    >
      <div className="text-[var(--color-text-muted)] font-medium tabular-nums">
        {formatDate(pick.posted_at)}
      </div>
      <div className={`text-center font-extrabold uppercase tracking-[0.10em] text-[10px] ${outcomeTone(pick.outcome)}`}>
        {pick.outcome ?? "—"}
      </div>
      <div className="min-w-0 truncate">
        {pick.game_label && (
          <span className="text-[var(--color-text-muted)] mr-2 font-medium">{pick.game_label}</span>
        )}
        <span className="font-bold text-[var(--color-text)]">
          {formatBetDescriptor({
            kind: pick.kind === "parlay" ? "parlay" : "straight",
            leg_count: pick.leg_count ?? null,
            market: pick.market,
            selection: pick.selection,
            line: pick.line,
            odds_taken: pick.odds_taken,
          })}
        </span>
      </div>
      <div className="text-right tabular-nums text-[var(--color-text-soft)]">
        {pick.line ?? ""}
      </div>
      <div className="text-right tabular-nums text-[var(--color-text-soft)]">{oddsText}</div>
      <div className={`text-right tabular-nums font-extrabold ${
        pick.profit_units == null
          ? "text-[var(--color-text-muted)]"
          : pick.profit_units > 0
            ? "text-[var(--color-pos)]"
            : pick.profit_units < 0
              ? "text-[var(--color-neg)]"
              : "text-[var(--color-text-muted)]"
      }`}>
        {pick.profit_units != null ? `${formatUnitsSmart(pick.profit_units)}u` : ""}
      </div>
      <div className="text-right tabular-nums text-[var(--color-text-muted)] font-mono text-[11px]">
        #{pick.id}
      </div>
      <div className="text-right">
        <Link
          href={`/admin/audit?pick_id=${pick.id}`}
          className="inline-block px-2.5 py-1 rounded-md bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-[10px] font-bold text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
        >
          Edit in audit
        </Link>
      </div>
    </div>
  );
}
