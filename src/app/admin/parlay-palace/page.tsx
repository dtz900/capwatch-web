import { fetchPalaceCandidates } from "@/lib/api";
import { PalaceQueueTable } from "./PalaceQueueTable";

export const metadata = {
  title: "Parlay Palace queue · TailSlips Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Curation floor: parlays below this profit aren't worth a palace page.
const MIN_PROFIT_UNITS = 20;

export default async function AdminPalacePage() {
  let items = [] as Awaited<ReturnType<typeof fetchPalaceCandidates>>;
  let err: string | null = null;
  try { items = await fetchPalaceCandidates(); }
  catch (e) { err = e instanceof Error ? e.message : String(e); }

  // The floor gates NEW candidates only. Drafts and published entries always
  // show regardless of profit: the unpublish control lives on the table row,
  // so hiding a sub-floor published entry stranded it live with no way to
  // pull it from the UI (Codex #70).
  const belowFloor = items.filter(
    (i) => i.status === "candidate" && i.profit_units < MIN_PROFIT_UNITS,
  ).length;
  items = items
    .filter((i) => i.status !== "candidate" || i.profit_units >= MIN_PROFIT_UNITS)
    .sort((a, b) => (b.graded_at ?? "").localeCompare(a.graded_at ?? ""));

  const counts = {
    candidate: items.filter((i) => i.status === "candidate").length,
    draft: items.filter((i) => i.status === "draft").length,
    published: items.filter((i) => i.status === "published").length,
  };

  return (
    <main className="max-w-[1100px] mx-auto px-7 pb-16">
      <header className="pt-10 pb-7">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] font-bold mb-2">
          Admin · Parlay Palace
        </div>
        <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none">
          Winning parlays to curate
        </h1>
        <p className="text-[13px] text-[var(--color-text-soft)] font-medium mt-2 max-w-[68ch]">
          Enrich to build the page (MLB box scores + hotlinked media + recap).
          Publish only when the hero asset is striking. Pull removes it and
          stops serving the media instantly.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Needs enrich" value={counts.candidate} hot={counts.candidate > 0} />
        <Stat label="Drafts ready" value={counts.draft} hot={counts.draft > 0} />
        <Stat label="Live in palace" value={counts.published} />
      </section>

      {err && (
        <div className="rounded-md border border-[rgba(255,80,80,0.4)] bg-[rgba(255,80,80,0.08)] text-[12px] text-[var(--color-neg)] px-3 py-2 mb-3">
          {err}
        </div>
      )}
      <PalaceQueueTable items={items} />
      {belowFloor > 0 && (
        <div className="text-[11px] text-[var(--color-text-muted)] font-medium mt-3 px-1">
          {belowFloor} parlay{belowFloor === 1 ? "" : "s"} under +
          {MIN_PROFIT_UNITS}u hidden.
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, hot = false }: {
  label: string; value: number; hot?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold mb-1.5">
        {label}
      </div>
      <div
        className={`font-extrabold tabular-nums leading-none tracking-[-0.02em] text-[22px] ${
          hot ? "text-[#f7f3e9]" : "text-[var(--color-text-muted)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
