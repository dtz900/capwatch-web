import { createServiceSupabase } from "@/lib/supabase/service";
import { fetchPickOutcomes } from "@/lib/api";
import { slipProfit } from "@/lib/betslip";
import { formatUnits } from "@/lib/formatters";
import { MARKET_LABELS } from "@/lib/edges";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users | TailSlips Admin" };

/* Admin roster: every TailSlips user with their stable (whole-capper and
   market-scoped tails) and bet slip record. Service-role reads because
   all three tables are owner-scoped by RLS. Users are unioned from
   ts_profiles + follows + slips so activity from a user whose roster row
   was cleaned (recreated on their next visit) still shows. */

interface ProfileRow {
  user_id: string;
  email: string | null;
  tier: string;
  created_at: string;
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
  odds: number;
  selection: string | null;
  capper_handle: string | null;
  created_at: string;
}

interface UserView {
  profile: ProfileRow | null;
  userId: string;
  whole: { handle: string; name: string | null }[];
  scoped: { handle: string; name: string | null; markets: string[] }[];
  slip: { total: number; wins: number; losses: number; pushes: number; pending: number; units: number };
  lastSlipAt: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminUsersPage() {
  const db = createServiceSupabase();
  if (!db) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-[var(--color-text-muted)]">
        SUPABASE_SERVICE_ROLE_KEY is not configured.
      </main>
    );
  }

  const [profilesRes, followsRes, slipsRes] = await Promise.all([
    db.from("ts_profiles").select("user_id, email, tier, created_at").order("created_at", { ascending: false }),
    db.from("capper_follows").select("user_id, capper_id, market"),
    db.from("user_bet_slips").select("user_id, pick_id, parlay_id, stake, odds, selection, capper_handle, created_at"),
  ]);
  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const follows = (followsRes.data ?? []) as FollowRow[];
  const slips = (slipsRes.data ?? []) as SlipRow[];

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

  const users: UserView[] = userIds.map((userId) => {
    const mine = follows.filter((f) => f.user_id === userId);
    const wholeIds = new Set(mine.filter((f) => f.market === "all").map((f) => f.capper_id));
    const scopedByCapper = new Map<number, string[]>();
    for (const f of mine) {
      if (f.market === "all" || wholeIds.has(f.capper_id)) continue;
      scopedByCapper.set(f.capper_id, [...(scopedByCapper.get(f.capper_id) ?? []), f.market]);
    }
    const capperRef = (id: number) => {
      const c = cappersById.get(id);
      return { handle: c?.handle ?? `#${id}`, name: c?.display_name ?? null };
    };

    const myslips = slips.filter((s) => s.user_id === userId);
    const slip = { total: myslips.length, wins: 0, losses: 0, pushes: 0, pending: 0, units: 0 };
    let lastSlipAt: string | null = null;
    for (const s of myslips) {
      if (lastSlipAt === null || s.created_at > lastSlipAt) lastSlipAt = s.created_at;
      const outcome =
        s.pick_id != null
          ? outcomes.picks[s.pick_id]?.outcome ?? null
          : s.parlay_id != null
            ? outcomes.parlays[s.parlay_id]?.outcome ?? null
            : "V";
      if (outcome === null) {
        slip.pending += 1;
        continue;
      }
      if (outcome === "W") slip.wins += 1;
      else if (outcome === "L") slip.losses += 1;
      else slip.pushes += 1;
      slip.units += slipProfit(outcome, s.stake, s.odds) ?? 0;
    }

    return {
      profile: profileById.get(userId) ?? null,
      userId,
      whole: [...wholeIds].map(capperRef),
      scoped: [...scopedByCapper.entries()].map(([id, markets]) => ({ ...capperRef(id), markets })),
      slip,
      lastSlipAt,
    };
  });

  // Most recently joined first; roster-pending rows (no profile) on top
  // since they represent the newest unexplained activity.
  users.sort((a, b) => (b.profile?.created_at ?? "9999") .localeCompare(a.profile?.created_at ?? "9999"));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Users</h1>
        <span className="text-xs text-[var(--color-text-muted)]">
          {users.length} user{users.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {users.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">No users yet.</p>
        )}
        {users.map((u) => (
          <div
            key={u.userId}
            className="rounded-2xl bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d] border border-[var(--color-border)] px-5 py-4"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[15px] font-bold text-[var(--color-text)]">
                {u.profile?.email ?? "(no email on file)"}
              </span>
              {u.profile?.tier === "vip" && (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-gold)] border border-[var(--color-gold)]">
                  VIP
                </span>
              )}
              {!u.profile && (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] border border-[var(--color-border)]">
                  roster row pending
                </span>
              )}
              <span className="ml-auto text-xs text-[var(--color-text-muted)]">
                {u.profile ? `joined ${fmtDate(u.profile.created_at)}` : ""}
              </span>
            </div>
            <div className="mt-1 font-mono text-[10px] text-[var(--color-text-muted)]">{u.userId}</div>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                  Stable
                </div>
                {u.whole.length === 0 && u.scoped.length === 0 ? (
                  <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">No tails.</p>
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {u.whole.map((c) => (
                      <span
                        key={`w-${c.handle}`}
                        className="rounded-md bg-[rgba(47,217,192,0.10)] px-2 py-1 text-xs font-semibold text-[#2fd9c0]"
                      >
                        @{c.handle}
                      </span>
                    ))}
                    {u.scoped.map((c) => (
                      <span
                        key={`s-${c.handle}`}
                        className="rounded-md bg-[rgba(202,164,90,0.10)] px-2 py-1 text-xs font-semibold text-[var(--color-gold)]"
                        title="Market-scoped tail"
                      >
                        @{c.handle} · {c.markets.map((m) => MARKET_LABELS[m] ?? m).join(", ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                  Bet Slip
                </div>
                {u.slip.total === 0 ? (
                  <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">No bets logged.</p>
                ) : (
                  <div className="mt-1.5 flex items-baseline gap-3 tabular-nums">
                    <span className="text-sm font-extrabold text-[var(--color-text)]">
                      {u.slip.wins}-{u.slip.losses}
                      {u.slip.pushes > 0 ? `-${u.slip.pushes}` : ""}
                    </span>
                    <span
                      className={`text-sm font-extrabold ${
                        u.slip.units >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"
                      }`}
                    >
                      {formatUnits(u.slip.units)}u
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {u.slip.total} logged · {u.slip.pending} pending
                      {u.lastSlipAt ? ` · last ${fmtDate(u.lastSlipAt)}` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
