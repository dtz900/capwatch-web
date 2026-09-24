import { createServiceSupabase } from "@/lib/supabase/service";
import { fetchPickOutcomes } from "@/lib/api";
import { slipProfit } from "@/lib/betslip";
import { MARKET_LABELS } from "@/lib/edges";
import { UsersTable, type UserRow } from "@/components/admin/UsersTable";
import { StatStrip, SignupTrend } from "@/components/admin/UsersOverview";
import { buildTrend, dayLabel, ptDayKey } from "@/lib/admin/signup-trend";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users | TailSlips Admin" };

/* Admin roster: every TailSlips account with what it has actually done.
   Service-role reads because ts_profiles, capper_follows, user_bet_slips and
   tof_tailer_stats are all owner-scoped by RLS. Users are unioned from
   profiles + follows + slips so activity from a user whose roster row was
   cleaned (recreated on their next visit) still shows. */

interface ProfileRow {
  user_id: string;
  email: string | null;
  tier: string;
  created_at: string;
  username: string | null;
}

interface FollowRow {
  user_id: string;
  capper_id: number;
  market: string;
}

interface SlipRow {
  user_id: string;
  pick_id: number | null;
  parlay_id: number | null;
  stake: number;
  odds: number | null;
  selection: string | null;
  capper_handle: string | null;
  created_at: string;
}

interface TofStatRow {
  user_id: string;
  plays: number;
  wins: number;
  losses: number;
  pushes: number;
  units: number;
  day_streak: number;
  last_played_date: string | null;
}

const TREND_DAYS = 21;

export default async function AdminUsersPage() {
  const db = createServiceSupabase();
  if (!db) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-[var(--color-text-muted)]">
        SUPABASE_SERVICE_ROLE_KEY is not configured.
      </main>
    );
  }

  const [profilesRes, followsRes, slipsRes, tofRes, claimedRes] = await Promise.all([
    db.from("ts_profiles").select("user_id, email, tier, created_at, username").order("created_at", { ascending: false }),
    db.from("capper_follows").select("user_id, capper_id, market"),
    db.from("user_bet_slips").select("user_id, pick_id, parlay_id, stake, odds, selection, capper_handle, created_at"),
    db
      .from("tof_tailer_stats")
      .select("user_id, plays, wins, losses, pushes, units, day_streak, last_played_date")
      .eq("time_window", "season"),
    db.from("cappers").select("handle, claimed_by_user_id").not("claimed_by_user_id", "is", null),
  ]);

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const follows = (followsRes.data ?? []) as FollowRow[];
  const slips = (slipsRes.data ?? []) as SlipRow[];
  const tofStats = (tofRes.data ?? []) as TofStatRow[];
  const claimed = (claimedRes.data ?? []) as { handle: string; claimed_by_user_id: string }[];

  const capperIds = [...new Set(follows.map((f) => f.capper_id))];
  const cappersById = new Map<number, { handle: string; display_name: string | null }>();
  if (capperIds.length > 0) {
    const { data } = await db.from("cappers").select("id, handle, display_name").in("id", capperIds);
    for (const c of (data ?? []) as { id: number; handle: string; display_name: string | null }[]) {
      cappersById.set(c.id, c);
    }
  }

  const pickIds = slips.map((s) => s.pick_id).filter((x): x is number => x != null);
  const parlayIds = slips.map((s) => s.parlay_id).filter((x): x is number => x != null);
  let outcomes: Awaited<ReturnType<typeof fetchPickOutcomes>> = { picks: {}, parlays: {} };
  try {
    if (pickIds.length > 0 || parlayIds.length > 0) {
      outcomes = await fetchPickOutcomes(pickIds, parlayIds);
    }
  } catch (err) {
    console.error("admin users outcomes fetch failed:", err);
  }

  const userIds = [
    ...new Set([
      ...profiles.map((p) => p.user_id),
      ...follows.map((f) => f.user_id),
      ...slips.map((s) => s.user_id),
    ]),
  ];
  const profileById = new Map(profiles.map((p) => [p.user_id, p]));
  const tofByUser = new Map(tofStats.map((t) => [t.user_id, t]));
  const capperByUser = new Map(claimed.map((c) => [c.claimed_by_user_id, c.handle]));

  const rows: UserRow[] = userIds.map((userId) => {
    const mine = follows.filter((f) => f.user_id === userId);
    const wholeIds = new Set(mine.filter((f) => f.market === "all").map((f) => f.capper_id));
    const scopedByCapper = new Map<number, string[]>();
    for (const f of mine) {
      if (f.market === "all" || wholeIds.has(f.capper_id)) continue;
      scopedByCapper.set(f.capper_id, [...(scopedByCapper.get(f.capper_id) ?? []), f.market]);
    }
    const handleOf = (id: number) => cappersById.get(id)?.handle ?? `#${id}`;

    const myslips = slips.filter((s) => s.user_id === userId);
    const slip = { total: myslips.length, wins: 0, losses: 0, pushes: 0, pending: 0, units: 0 };
    let lastSlipAt: string | null = null;
    for (const s of myslips) {
      if (lastSlipAt === null || s.created_at > lastSlipAt) lastSlipAt = s.created_at;
      const graded =
        s.pick_id != null
          ? outcomes.picks[s.pick_id] ?? null
          : s.parlay_id != null
            ? outcomes.parlays[s.parlay_id] ?? null
            : null;
      const outcome = graded?.outcome ?? (s.pick_id == null && s.parlay_id == null ? "V" : null);
      if (outcome === null) {
        slip.pending += 1;
        continue;
      }
      if (outcome === "W") slip.wins += 1;
      else if (outcome === "L") slip.losses += 1;
      else slip.pushes += 1;
      // odds NULL = follow market: settle at the graded price
      slip.units += slipProfit(outcome, s.stake, s.odds ?? graded?.market_odds ?? null) ?? 0;
    }

    const profile = profileById.get(userId) ?? null;
    const t = tofByUser.get(userId) ?? null;

    return {
      userId,
      email: profile?.email ?? null,
      username: profile?.username ?? null,
      tier: profile?.tier ?? null,
      createdAt: profile?.created_at ?? null,
      joinedLabel: dayLabel(profile?.created_at ?? null),
      capperHandle: capperByUser.get(userId) ?? null,
      stable: [
        ...[...wholeIds].map((id) => ({ handle: handleOf(id), markets: null })),
        ...[...scopedByCapper.entries()].map(([id, markets]) => ({
          handle: handleOf(id),
          markets: markets.map((m) => MARKET_LABELS[m] ?? m),
        })),
      ],
      slip,
      lastSlipLabel: dayLabel(lastSlipAt),
      tof: t
        ? {
            plays: t.plays,
            wins: t.wins,
            losses: t.losses,
            pushes: t.pushes,
            units: Number(t.units ?? 0),
            streak: t.day_streak,
            lastPlayedLabel: dayLabel(t.last_played_date),
          }
        : null,
    };
  });

  // Newest first; roster-pending rows (no profile) on top since they are the
  // newest unexplained activity.
  rows.sort((a, b) => (b.createdAt ?? "9999").localeCompare(a.createdAt ?? "9999"));

  const todayKey = ptDayKey(new Date());
  const days = buildTrend(profiles.map((p) => p.created_at), todayKey, TREND_DAYS);
  const newThisWeek = days.slice(-7).reduce((n, d) => n + d.count, 0);
  const joinedToday = days[days.length - 1]?.count ?? 0;
  const withUsername = rows.filter((u) => u.username).length;
  const verified = rows.filter((u) => u.capperHandle).length;
  const withStable = rows.filter((u) => u.stable.length > 0).length;
  const withSlip = rows.filter((u) => u.slip.total > 0).length;
  const playedTof = rows.filter((u) => (u.tof?.plays ?? 0) > 0).length;

  return (
    <main className="mx-auto max-w-[1080px] px-7 pb-16">
      <header className="pb-5 pt-10">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.20em] text-[var(--color-text-muted)]">
          Admin · users
        </div>
        <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.02em]">Roster</h1>
        <p className="mt-2 text-[13px] font-medium text-[var(--color-text-soft)]">
          Every account and what it has actually done. Sorted newest first; switch to{" "}
          <strong>most active</strong> to put the people using the site on top.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <StatStrip
          stats={[
            { label: "Accounts", value: rows.length, note: `${joinedToday} today` },
            { label: "New · 7d", value: newThisWeek },
            { label: "Username", value: withUsername },
            { label: "Verified", value: verified },
            { label: "Has stable", value: withStable },
            { label: "Played ToF", value: playedTof, note: `${withSlip} logged a bet` },
          ]}
        />
        <SignupTrend days={days} />
      </div>

      <div className="mt-6">
        <UsersTable rows={rows} />
      </div>
    </main>
  );
}
