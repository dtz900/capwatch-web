import { redirect } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import { AddCapperForm } from "./AddCapperForm";

export const metadata = {
  title: "Cappers · TailSlips Admin",
  robots: { index: false, follow: false },
};

async function browseCapperPicks(formData: FormData) {
  "use server";
  const raw = String(formData.get("handle") ?? "").trim().replace(/^@/, "");
  if (!raw) return;
  redirect(`/admin/cappers/${encodeURIComponent(raw.toLowerCase())}/picks`);
}

export default function AdminCappersPage() {
  return (
    <>
      <TopNav />
      <main className="max-w-[720px] mx-auto px-7 pb-16">
        <header className="pt-10 pb-7">
          <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-bold mb-2">
            Admin · cappers
          </div>
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none">
            Cappers
          </h1>
          <p className="text-[13px] text-[var(--color-text-soft)] font-medium mt-2">
            Add a new capper, or jump into any tracked capper&apos;s pick history with
            pick_ids and one-click edit links.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-4 mb-8">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-3">
            Browse a capper&apos;s picks
          </div>
          <form action={browseCapperPicks} className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] focus-within:border-[rgba(255,255,255,0.20)]">
              <span className="pl-3 pr-1 text-[var(--color-text-muted)] text-sm font-semibold">@</span>
              <input
                type="text"
                name="handle"
                placeholder="handle"
                autoComplete="off"
                spellCheck={false}
                required
                className="bg-transparent py-1.5 pr-3 text-sm text-[var(--color-text)] outline-none w-44"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)] text-[12px] font-bold text-[var(--color-text)]"
            >
              Open
            </button>
            <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
              Direct route: <code className="text-[11px] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">/admin/cappers/&lt;handle&gt;/picks</code>
            </span>
          </form>
        </section>

        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold mb-3">
          Add capper
        </div>
        <AddCapperForm />
      </main>
    </>
  );
}
