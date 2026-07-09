import { notFound } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";
import { createServerSupabase } from "@/lib/supabase/server";
import { fetchLeaderboard, fetchTodayPicks } from "@/lib/api";
import { vipEnabled } from "@/lib/flags";
import { StableGrid } from "@/components/my-tails/StableGrid";
import { TodayStrip } from "@/components/my-tails/TodayStrip";
import { EmptyStable } from "@/components/my-tails/EmptyStable";
import type { CapperRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Tails | TailSlips" };

export default async function MyTailsPage() {
  if (!vipEnabled()) notFound();

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const lb = await fetchLeaderboard({
    window: "season",
    sort: "units_profit",
    bet_type: "all",
    min_picks: 0,
    active_only: false,
  });
  const byId = new Map<string, CapperRow>(lb.leaderboard.map((r) => [r.capper_id, r]));
  const top3 = lb.leaderboard.slice(0, 3);

  if (!user) {
    return (
      <>
        <TopNav />
        <main className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">My Tails</h1>
          <p className="mt-2 text-sm text-[var(--color-text-soft)]">
            <Link href="/login" className="underline">Sign in</Link> to tail cappers and track
            your stable here.
          </p>
          <div className="mt-8"><EmptyStable suggestions={top3} /></div>
        </main>
      </>
    );
  }

  const { data: follows, error: followsError } = await supabase
    .from("capper_follows")
    .select("capper_id")
    .eq("user_id", user.id);
  if (followsError) console.error("my-tails follows query failed:", followsError);
  const ids = (follows ?? []).map((f: { capper_id: number }) => f.capper_id);
  const stable = ids.map((id) => byId.get(String(id))).filter(Boolean) as CapperRow[];
  const today = ids.length > 0 ? await fetchTodayPicks(ids).catch(() => ({ date: "", picks: [] })) : { date: "", picks: [] };

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">My Tails</h1>
        {ids.length === 0 ? (
          <EmptyStable suggestions={top3} />
        ) : (
          <>
            <TodayStrip picks={today.picks} date={today.date} />
            <StableGrid initial={stable} />
          </>
        )}
      </main>
    </>
  );
}
