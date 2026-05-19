import { fetchPalaceCandidates } from "@/lib/api";
import { PalaceQueueTable } from "./PalaceQueueTable";

export const metadata = {
  title: "Parlay Palace queue · TailSlips Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function AdminPalacePage() {
  let items = [] as Awaited<ReturnType<typeof fetchPalaceCandidates>>;
  let err: string | null = null;
  try { items = await fetchPalaceCandidates(); }
  catch (e) { err = e instanceof Error ? e.message : String(e); }
  return (
    <main className="max-w-[1100px] mx-auto px-7 pb-16">
      <header className="pt-10 pb-7">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] font-bold mb-2">
          Admin · Parlay Palace
        </div>
        <h1 className="text-[32px] font-extrabold tracking-[-0.02em]">
          Winning parlays to curate
        </h1>
        <p className="text-[13px] text-[var(--color-text-soft)] mt-2 max-w-[68ch]">
          Enrich to build the page (MLB box scores + hotlinked media + recap).
          Publish only when the hero asset is striking. Pull removes it and
          stops serving the media instantly.
        </p>
      </header>
      {err && (
        <div className="rounded-md border border-[rgba(255,80,80,0.4)] bg-[rgba(255,80,80,0.08)] text-[12px] text-[var(--color-neg)] px-3 py-2 mb-3">
          {err}
        </div>
      )}
      <PalaceQueueTable items={items} />
    </main>
  );
}
