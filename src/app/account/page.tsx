"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import { useAuth } from "@/components/auth/AuthProvider";
import { vipEnabled, vipTierEnabled } from "@/lib/flags";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { fetchPickOutcomes } from "@/lib/api";
import { slipProfit } from "@/lib/betslip";
import { formatUnits } from "@/lib/formatters";

interface SlipSummary {
  wins: number;
  losses: number;
  pushes: number;
  pending: number;
  units: number;
}

interface TailSummary {
  cappers: number;
  marketTails: number;
}

function memberSince(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Big-number stat cell for the scoreboard cards. */
function Stat({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: string;
  tone?: "plain" | "pos" | "neg" | "muted";
}) {
  const color =
    tone === "pos"
      ? "text-[var(--color-pos)]"
      : tone === "neg"
        ? "text-[var(--color-neg)]"
        : tone === "muted"
          ? "text-[var(--color-text-muted)]"
          : "text-[var(--color-text)]";
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className={`mt-1 text-[26px] leading-none font-extrabold tabular-nums ${color}`}>
        {value}
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { entitlements, session, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tails, setTails] = useState<TailSummary | null>(null);
  const [slip, setSlip] = useState<SlipSummary | null>(null);

  const userId = session?.user?.id ?? null;
  const supabase = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? createBrowserSupabase()
        : null,
    []
  );

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from("capper_follows")
        .select("capper_id, market")
        .eq("user_id", userId);
      if (cancelled) return;
      if (err) {
        console.error("account tails load failed:", err);
        setTails({ cappers: 0, marketTails: 0 });
        return;
      }
      const rows = (data ?? []) as { capper_id: number; market: string }[];
      setTails({
        cappers: new Set(rows.map((r) => r.capper_id)).size,
        marketTails: rows.filter((r) => r.market !== "all").length,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from("user_bet_slips")
        .select("pick_id, parlay_id, stake, odds")
        .eq("user_id", userId);
      if (cancelled) return;
      if (err) {
        console.error("account slip load failed:", err);
        setSlip({ wins: 0, losses: 0, pushes: 0, pending: 0, units: 0 });
        return;
      }
      const rows = (data ?? []) as {
        pick_id: number | null;
        parlay_id: number | null;
        stake: number;
        odds: number;
      }[];
      const ids = rows.map((r) => r.pick_id).filter((x): x is number => x != null);
      const pids = rows.map((r) => r.parlay_id).filter((x): x is number => x != null);
      let outcomes: Awaited<ReturnType<typeof fetchPickOutcomes>> = { picks: {}, parlays: {} };
      try {
        if (ids.length > 0 || pids.length > 0) outcomes = await fetchPickOutcomes(ids, pids);
      } catch (e) {
        console.error("account slip outcomes failed:", e);
      }
      if (cancelled) return;
      const summary: SlipSummary = { wins: 0, losses: 0, pushes: 0, pending: 0, units: 0 };
      for (const r of rows) {
        const outcome =
          r.pick_id != null
            ? outcomes.picks[r.pick_id]?.outcome ?? null
            : r.parlay_id != null
              ? outcomes.parlays[r.parlay_id]?.outcome ?? null
              : "V";
        if (outcome === null) {
          summary.pending += 1;
          continue;
        }
        if (outcome === "W") summary.wins += 1;
        else if (outcome === "L") summary.losses += 1;
        else summary.pushes += 1;
        summary.units += slipProfit(outcome, r.stake, r.odds) ?? 0;
      }
      setSlip(summary);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  // Guard after hooks per branch convention
  if (!vipEnabled()) notFound();

  async function upgrade() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const body = await res.json();
    if (res.ok && body.url) window.location.href = body.url;
    else {
      setError(body.error ?? "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  if (!entitlements.isLoggedIn) {
    return (
      <>
        <TopNav />
        <main className="mx-auto max-w-md px-4 py-16 text-center text-[var(--color-text-soft)]">
          Sign in at <a href="/login" className="underline">/login</a> to manage your account.
        </main>
      </>
    );
  }

  const email = session?.user?.email ?? "";
  const since = memberSince(session?.user?.created_at);

  return (
    <>
    <TopNav />
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* Identity card */}
      <div className="rounded-2xl bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d] border border-[var(--color-border)] px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(47,217,192,0.12)] text-lg font-extrabold uppercase text-[#2fd9c0]">
              {email.slice(0, 1) || "?"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold text-[var(--color-text)]">{email}</div>
              {since && (
                <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  Member since {since}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => void signOut().catch(console.error)}
            className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-soft)] hover:border-[var(--color-neg)] hover:text-[var(--color-neg)]"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* My Tails summary */}
      <div className="mt-4 rounded-2xl bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d] border border-[var(--color-border)] px-6 py-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
            My Tails
          </h2>
          <Link
            href="/my-tails"
            className="text-xs font-semibold text-[#2fd9c0] hover:underline"
          >
            View stable
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Stat label="Cappers tailed" value={tails ? String(tails.cappers) : "–"} />
          <Stat label="Market tails" value={tails ? String(tails.marketTails) : "–"} />
        </div>
        {tails && tails.cappers === 0 && (
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Tail a capper from the <Link href="/leaderboard" className="underline">leaderboard</Link>{" "}
            to build your stable.
          </p>
        )}
      </div>

      {/* Bet slip record */}
      <div className="mt-4 rounded-2xl bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d] border border-[var(--color-border)] px-6 py-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
            Bet Slip Record
          </h2>
          <span className="text-xs text-[var(--color-text-muted)]">
            {slip ? `${slip.pending} pending` : ""}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat
            label="Record"
            value={slip ? `${slip.wins}-${slip.losses}${slip.pushes ? `-${slip.pushes}` : ""}` : "–"}
          />
          <Stat
            label="All-time P&L"
            value={slip ? `${formatUnits(slip.units)}u` : "–"}
            tone={slip ? (slip.units >= 0 ? "pos" : "neg") : "muted"}
          />
          <Stat
            label="Bets logged"
            value={slip ? String(slip.wins + slip.losses + slip.pushes + slip.pending) : "–"}
          />
        </div>
        {slip && slip.wins + slip.losses + slip.pushes + slip.pending === 0 && (
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Add picks to your slip from <Link href="/my-tails" className="underline">My Tails</Link>;
            they grade themselves.
          </p>
        )}
      </div>

      {/* Plan (dark until the VIP tier launches) */}
      {vipTierEnabled() && (
        <div className="mt-4 rounded-2xl bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d] border border-[var(--color-border)] px-6 py-5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
            Plan
          </h2>
          <div className="mt-2 text-sm text-[var(--color-text)]">
            <span className={entitlements.isVip ? "text-[var(--color-gold)] font-semibold" : ""}>
              {entitlements.isVip ? "VIP" : "Free"}
            </span>
          </div>
          {!entitlements.isVip && (
            <>
              <p className="mt-3 text-sm text-[var(--color-text-soft)]">
                VIP unlocks closing line value, de-lucked ROI by market, and trust
                signals on every capper.
              </p>
              <button
                onClick={upgrade}
                disabled={busy}
                className="mt-3 rounded-lg bg-[var(--color-text)] text-black font-semibold px-4 py-2 text-sm disabled:opacity-50"
              >
                {busy ? "Redirecting..." : "Upgrade to VIP"}
              </button>
              {error && <p className="mt-2 text-sm text-[var(--color-neg)]">{error}</p>}
            </>
          )}
        </div>
      )}
    </main>
    </>
  );
}
