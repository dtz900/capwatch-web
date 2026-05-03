import { TopNav } from "@/components/nav/TopNav";
import { AddCapperForm } from "./AddCapperForm";

export const metadata = {
  title: "Add capper · TailSlips Admin",
  robots: { index: false, follow: false },
};

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
            Add capper
          </h1>
          <p className="text-[13px] text-[var(--color-text-soft)] font-medium mt-2">
            Equivalent to <code className="text-[12px] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">jobs/add_capper.py</code>.
            Idempotent: re-adding a tracked handle is a no-op. Paused/removed handles are reactivated.
          </p>
        </header>

        <AddCapperForm />
      </main>
    </>
  );
}
