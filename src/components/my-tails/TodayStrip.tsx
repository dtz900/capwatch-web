import Link from "next/link";
import type { TodayPickEntry } from "@/lib/types";

const STATUS: Record<string, { label: string; cls: string }> = {
  W: { label: "WON", cls: "bg-[var(--color-pos)]/15 text-[var(--color-pos)] border-[var(--color-pos)]/40" },
  L: { label: "LOST", cls: "bg-[var(--color-neg)]/15 text-[var(--color-neg)] border-[var(--color-neg)]/40" },
  P: { label: "PUSH", cls: "text-[var(--color-text-muted)] border-[var(--color-border-h)]" },
  V: { label: "VOID", cls: "text-[var(--color-text-muted)] border-[var(--color-border-h)]" },
};

function StatusPill({ outcome }: { outcome: TodayPickEntry["outcome"] }) {
  if (!outcome) {
    return (
      <span className="rounded-md border border-dashed border-[var(--color-border-h)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--color-text-soft)]">
        PENDING
      </span>
    );
  }
  const s = STATUS[outcome];
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function TodayStrip({ picks, date }: { picks: TodayPickEntry[]; date: string }) {
  return (
    <section className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-5 py-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
          Today {date && `· ${date}`}
        </span>
        <span className="text-xs text-[var(--color-text-soft)]">
          {picks.length > 0
            ? `${picks.length} pick${picks.length === 1 ? "" : "s"} from your tails today`
            : ""}
        </span>
      </div>
      {picks.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          No picks from your tails yet today.
        </p>
      ) : (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {picks.map((p, i) => (
            <Link
              key={`${p.capper_id}-${p.posted_at}-${i}`}
              href={p.handle ? `/cappers/${p.handle}` : "#"}
              className="min-w-[220px] shrink-0 rounded-xl border border-[var(--color-border)] bg-black/20 px-3 py-2.5 hover:border-[var(--color-border-h)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--color-text)] truncate">
                  {p.display_name ?? p.handle}
                </span>
                <StatusPill outcome={p.outcome} />
              </div>
              <div className="mt-1.5 text-sm text-[var(--color-text)] truncate">{p.selection}</div>
              <div className="mt-0.5 text-xs text-[var(--color-text-muted)] truncate">
                {p.matchup ?? (p.kind === "parlay" ? "Multi-game" : "")}
                {p.odds_taken != null && <span>{` · ${p.odds_taken > 0 ? "+" : ""}${p.odds_taken}`}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
