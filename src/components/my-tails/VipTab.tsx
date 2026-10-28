"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { LockedHeader, LockedTicketList, groupLockedTickets } from "@/components/vip/LockedPicks";
import { getVipSubscriptions } from "@/lib/vip/client";
import type { VipSubscription } from "@/lib/vip/types";

type LoadState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; subscriptions: VipSubscription[] };

function pillLabel(sub: VipSubscription): string {
  if (sub.status === "active") return "Active";
  if (sub.status === "canceled") return "Canceled";
  if (sub.pause_reason === "cold") return "Paused: cold";
  if (sub.pause_reason === "silent") return "Paused: quiet";
  return "Paused";
}

/* Same geometry as the My Tails StatusPill. */
function SubStatusPill({ sub }: { sub: VipSubscription }) {
  const tone =
    sub.status === "active"
      ? "bg-[var(--color-pos)]/15 text-[var(--color-pos)] border-[var(--color-pos)]/40"
      : sub.status === "canceled"
        ? "text-[var(--color-text-muted)] border-[var(--color-border-h)]"
        : "border-dashed border-[var(--color-border-h)] text-[var(--color-text-soft)]";
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider ${tone}`}>
      {pillLabel(sub)}
    </span>
  );
}

function SubscriptionCard({ sub }: { sub: VipSubscription }) {
  const { capper } = sub;
  const emptyNote =
    sub.status === "paused"
      ? "No picks while paused."
      : sub.status === "canceled"
        ? "No picks after cancel."
        : sub.locked.length === 0
          ? "No locked picks right now."
          : null;
  const tickets = groupLockedTickets(sub.locked);
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d] border border-[var(--color-border)] px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/cappers/${encodeURIComponent(capper.handle)}`} className="block min-w-0">
          <div className="flex items-center gap-3">
            <CapperAvatar url={capper.profile_image_url} handle={capper.handle} size={44} />
            <div className="min-w-0">
              <div className="font-bold text-[var(--color-text)] truncate">
                {capper.display_name ?? capper.handle}
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">@{capper.handle}</span>
            </div>
          </div>
        </Link>
        <SubStatusPill sub={sub} />
      </div>

      <div className="mt-4">
        {emptyNote ? (
          <p className="text-[12px] text-[var(--color-text-muted)]">{emptyNote}</p>
        ) : (
          <>
            <LockedHeader count={tickets.length} className="mb-2" />
            <LockedTicketList tickets={tickets} />
          </>
        )}
      </div>
    </div>
  );
}

/** Presentational card list; the fixtures page renders it with mock data. */
export function VipSubscriptionCards({ subscriptions }: { subscriptions: VipSubscription[] }) {
  if (subscriptions.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-soft)]">
        You are not subscribed to any capper yet.
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {subscriptions.map((s) => (
        <SubscriptionCard key={s.capper.id} sub={s} />
      ))}
    </div>
  );
}

export function VipTab() {
  const { session, authReady } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  // Tagged with the user it loaded for: a user change shows loading until
  // the new list lands; a token refresh (same user) changes nothing.
  const [state, setState] = useState<{ userId: string; load: LoadState } | null>(null);
  const tokenRef = useRef<string | null>(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    if (!authReady || !userId) return;
    let cancelled = false;
    getVipSubscriptions(tokenRef.current)
      .then((res) => {
        if (!cancelled) setState({ userId, load: { kind: "ready", subscriptions: res.subscriptions } });
      })
      .catch((err) => {
        console.error("my-tails vip subscriptions failed:", err);
        if (!cancelled) setState({ userId, load: { kind: "error" } });
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, userId]);

  if (!authReady) return null;
  if (!userId) {
    return (
      <p className="text-sm text-[var(--color-text-soft)]">Sign in to see your VIP subscriptions.</p>
    );
  }
  const load: LoadState = state?.userId === userId ? state.load : { kind: "loading" };
  if (load.kind === "loading") return null;
  if (load.kind === "error") {
    return (
      <p className="text-sm text-[var(--color-text-soft)]">Could not load your subscriptions.</p>
    );
  }
  return <VipSubscriptionCards subscriptions={load.subscriptions} />;
}
