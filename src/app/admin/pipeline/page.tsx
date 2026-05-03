import { TopNav } from "@/components/nav/TopNav";
import { PipelineTicker } from "./PipelineTicker";

export const metadata = {
  title: "Pipeline ticker · TailSlips Admin",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ handle?: string; minutes?: string }>;
}

export default async function AdminPipelinePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const handle = (sp.handle ?? "").trim();
  const minutes = Math.max(1, Math.min(1440, parseInt(sp.minutes ?? "60", 10) || 60));

  return (
    <>
      <TopNav />
      <main className="max-w-[1080px] mx-auto px-7 pb-16">
        <header className="pt-10 pb-6">
          <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-bold mb-2">
            Admin · pipeline
          </div>
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none">
            Live ticker
          </h1>
          <p className="text-[13px] text-[var(--color-text-soft)] font-medium mt-2">
            Tweets captured, parsed, picks inserted, and grades written, ordered newest first. Polls every 15 seconds.
          </p>
        </header>

        <PipelineTicker initialHandle={handle} initialMinutes={minutes} />
      </main>
    </>
  );
}
