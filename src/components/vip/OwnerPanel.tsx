"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getVipMe, patchVipSeller } from "@/lib/vip/client";
import type { VipMe, VipSeller } from "@/lib/vip/types";
import { formatPrice } from "./format";
import { PriceInput, SellerSetupCard, goldBtnCls, parsePriceDollars } from "./SellerSetupCard";
import { VipPickComposer } from "./VipPickComposer";

function PriceLine({ seller, onSaved }: { seller: VipSeller; onSaved: () => void }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(formatPrice(seller.price_cents));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dollars = parsePriceDollars(price);

  const save = async () => {
    if (dollars === null) return;
    setPending(true);
    setError(null);
    try {
      await patchVipSeller({ price_cents: dollars * 100 }, token);
      setEditing(false);
      onSaved();
    } catch (err) {
      console.error("VIP price change failed", err);
      setError("Could not change the price. Try again.");
    } finally {
      setPending(false);
    }
  };

  if (!editing) {
    return (
      <div className="text-[12px] font-semibold text-[var(--color-text-soft)]">
        Selling at ${formatPrice(seller.price_cents)}/mo ·{" "}
        <button
          type="button"
          className="underline underline-offset-2 hover:text-[var(--color-text)]"
          onClick={() => {
            setPrice(formatPrice(seller.price_cents));
            setEditing(true);
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <PriceInput id="vip-seller-price-edit" value={price} onChange={setPrice} />
      <button
        type="button"
        className={goldBtnCls}
        disabled={dollars === null || pending}
        onClick={save}
      >
        Save
      </button>
      <button
        type="button"
        className="text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        onClick={() => setEditing(false)}
      >
        Cancel
      </button>
      {error && (
        <span role="status" className="text-[11px] text-[#f87171] font-semibold">
          {error}
        </span>
      )}
    </div>
  );
}

const DENYLISTED_HANDLES = new Set(["fadeai_", "tailslips"]);

/** Owner-only panel on a capper's own profile: start selling, or the price line + composer. */
export function OwnerPanel({ onChanged }: { onChanged?: () => void } = {}) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  // Read at request time: a token refresh for the same user must not
  // refetch or unmount the panel (and with it the composer draft).
  const tokenRef = useRef<string | null>(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  // Tagged with the user it was fetched for, so a sign-out or account
  // switch never shows the previous owner's panel.
  const [loaded, setLoaded] = useState<{ userId: string; me: VipMe | null } | null>(null);
  const [tick, setTick] = useState(0);
  // Re-read /me (seller row, eligibility) and tell the section to refetch
  // the public status so the door and locked block match.
  const refresh = useCallback(() => {
    setTick((t) => t + 1);
    onChanged?.();
  }, [onChanged]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getVipMe(tokenRef.current)
      .then((m) => {
        if (!cancelled) setLoaded({ userId, me: m });
      })
      .catch((err: unknown) => {
        // The owner panel must never break the public profile: log and hide.
        console.error("VIP me failed", err);
        if (!cancelled) setLoaded({ userId, me: null });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  const me = userId && loaded?.userId === userId ? loaded.me : null;
  if (!me || !me.capper) return null;
  // House accounts never sell (the platform denylists them too).
  if (DENYLISTED_HANDLES.has(me.capper.handle.toLowerCase())) return null;

  return <OwnerPanelView me={me} onRefresh={refresh} onPosted={() => onChanged?.()} />;
}

/** Presentational owner panel for a loaded /me. `composerToken` lets the
 *  fixtures page show the composer without a signed-in session. */
export function OwnerPanelView({
  me,
  onRefresh,
  onPosted,
  composerToken,
}: {
  me: VipMe;
  onRefresh: () => void;
  onPosted: () => void;
  composerToken?: string;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
          Your VIP
        </span>
      </div>
      {me.seller ? (
        <>
          <PriceLine key={me.seller.price_cents} seller={me.seller} onSaved={onRefresh} />
          <VipPickComposer me={me} onPosted={onPosted} token={composerToken} />
        </>
      ) : (
        <SellerSetupCard me={me} onDone={onRefresh} />
      )}
    </section>
  );
}
