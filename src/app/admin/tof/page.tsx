import { createServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tail or Fade funnel | TailSlips Admin" };

/* The Tail or Fade funnel, one row per hand.
 *
 * The signed-in columns come from tof_plays and were always visible. The
 * guest columns are the point of this page: a signed-out visitor can swipe
 * the whole deck, and until tof_guest_swipes existed none of that reached the
 * database, so a quiet day and a day where the sign-in wall ate everyone read
 * identically. Service-role reads: the view is invisible to anon and
 * authenticated by design. */

interface FunnelRow {
  hand_id: number;
  slate_date: string;
  dealt_at: string | null;
  status: string;
  guest_browsers: number;
  guest_swipes: number;
  guest_decisions: number;
  converted_browsers: number;
  players: number;
  plays: number;
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return "";
  return `${Math.round((part / whole) * 100)}%`;
}

function fmtDate(d: string): string {
  const parsed = new Date(`${d}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const TH = "px-3 py-2 text-left text-[10px] uppercase tracking-[0.14em] font-extrabold text-[var(--color-text-muted)]";
const TD = "px-3 py-2 text-[13px] font-semibold tabular-nums";

export default async function AdminTofFunnelPage() {
  const db = createServiceSupabase();
  if (!db) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-[var(--color-text-muted)]">
        SUPABASE_SERVICE_ROLE_KEY is not configured.
      </main>
    );
  }

  const { data, error } = await db
    .from("tof_funnel_daily")
    .select("*")
    .order("hand_id", { ascending: false })
    .limit(30);

  const rows = (data ?? []) as FunnelRow[];

  return (
    <main className="max-w-[1080px] mx-auto px-7 pb-16">
      <header className="pt-10 pb-6">
        <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-bold mb-2">
          Admin · tail or fade
        </div>
        <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none">Funnel</h1>
        <p className="text-[13px] text-[var(--color-text-soft)] font-medium mt-2">
          Per hand. <strong>Browsers</strong> is how many signed-out visitors swiped at least one card,
          <strong> decisions</strong> counts their tails and fades but not passes, and{" "}
          <strong>signed up</strong> is how many of those browsers later made an account. A row with
          browsers and no sign-ups is the sign-in wall doing the damage; a row with no browsers at all
          is a traffic problem instead.
        </p>
      </header>

      {error ? (
        <p className="text-[13px] text-[var(--color-neg)] font-semibold">
          Could not read the funnel view: {error.message}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)] font-semibold">No hands dealt yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full border-collapse">
            <thead className="bg-[rgba(255,255,255,0.03)]">
              <tr>
                <th className={TH}>Hand</th>
                <th className={TH}>Slate</th>
                <th className={TH}>Guest browsers</th>
                <th className={TH}>Guest swipes</th>
                <th className={TH}>Decisions</th>
                <th className={TH}>Signed up</th>
                <th className={TH}>Conv.</th>
                <th className={TH}>Players</th>
                <th className={TH}>Plays</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.hand_id} className="border-t border-[var(--color-border)]">
                  <td className={`${TD} text-[var(--color-text-muted)]`}>#{r.hand_id}</td>
                  <td className={TD}>
                    {fmtDate(r.slate_date)}
                    {r.status !== "open" ? (
                      <span className="ml-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)] font-extrabold">
                        {r.status}
                      </span>
                    ) : null}
                  </td>
                  <td className={TD}>{r.guest_browsers}</td>
                  <td className={`${TD} text-[var(--color-text-soft)]`}>{r.guest_swipes}</td>
                  <td className={TD}>{r.guest_decisions}</td>
                  <td className={TD}>{r.converted_browsers}</td>
                  <td className={`${TD} text-[var(--color-text-soft)]`}>
                    {pct(r.converted_browsers, r.guest_browsers)}
                  </td>
                  <td className={TD}>{r.players}</td>
                  <td className={`${TD} text-[var(--color-text-soft)]`}>{r.plays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
