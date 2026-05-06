import Link from "next/link";
import { fetchReviewQueue } from "@/lib/api";
import { ReviewQueueTable } from "./ReviewQueueTable";

interface PageProps {
  searchParams: Promise<{ offset?: string }>;
}

export const metadata = {
  title: "Review queue · TailSlips Admin",
  robots: { index: false, follow: false },
};

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminReviewPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const offset = Math.max(0, parseInt(sp.offset ?? "0", 10) || 0);

  const data = await fetchReviewQueue(PAGE_SIZE, offset);

  const showingFrom = data.items.length === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + data.items.length, data.total);

  return (
    <>
      <main className="max-w-[1240px] mx-auto px-7 pb-16">
        <header className="pt-10 pb-7">
          <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-bold mb-2">
            Admin · review queue
          </div>
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none">
            Picks awaiting review
          </h1>
          <p className="text-[13px] text-[var(--color-text-soft)] font-medium mt-2 max-w-[68ch]">
            Parsed picks the system flagged as suspicious shape (info-dump
            tweets, probability sheets, sims output). They are stored but not
            published to the public leaderboard until you approve. Reject if
            the tweet wasn&apos;t actually a bet declaration.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <Stat label="In queue" value={data.total} tone={data.total > 0 ? "neg" : "neutral"} />
          <Stat label="Showing" value={data.items.length} tone="neutral" />
          <Stat label="Page size" value={PAGE_SIZE} tone="neutral" />
        </section>

        <ReviewQueueTable items={data.items} />

        <div className="flex items-center justify-between px-4 py-3 mt-4 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] font-medium">
          <div>
            Showing {showingFrom}-{showingTo} of {data.total}
          </div>
          <div className="flex items-center gap-2">
            {offset > 0 && (
              <Link
                href={`/admin/review?offset=${Math.max(0, offset - PAGE_SIZE)}`}
                className="px-3 py-1 rounded-md bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[var(--color-text-soft)] text-[11px] font-bold"
              >
                ← Newer
              </Link>
            )}
            {offset + data.items.length < data.total && (
              <Link
                href={`/admin/review?offset=${offset + PAGE_SIZE}`}
                className="px-3 py-1 rounded-md bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[var(--color-text-soft)] text-[11px] font-bold"
              >
                Older →
              </Link>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between py-7 pb-2 mt-6 text-xs text-[var(--color-text-muted)] font-medium">
          <div>
            Live data. Approve promotes to auto_approved + refreshes capper aggregates. Reject
            marks rejected, drops any existing grade, and refreshes aggregates.
          </div>
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
