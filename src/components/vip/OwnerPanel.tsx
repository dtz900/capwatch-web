"use client";

import { useCallback, useEffect, useState } from "react";
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
      {error && <span className="text-[11px] text-[#f87171] font-semibold">{error}</span>}
    </div>
  );
}

/** Owner-only panel on a capper's own profile: start selling, or the price line + composer. */
export function OwnerPanel({ onChanged }: { onChanged?: () => void } = {}) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  // Tagged with the token it was fetched for, so a sign-out or account
  // switch never shows the previous owner's panel.
  const [loaded, setLoaded] = useState<{ token: string; me: VipMe | null } | null>(null);
  const [tick, setTick] = useState(0);
  // Re-read /me (seller row, eligibility) and tell the section to refetch
  // the public status so the door and locked block match.
  const refresh = useCallback(() => {
    setTick((t) => t + 1);
    onChanged?.();
  }, [onChanged]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getVipMe(token)
      .then((m) => {
        if (!cancelled) setLoaded({ token, me: m });
      })
      .catch((err: unknown) => {
        // The owner panel must never break the public profile: log and hide.
        console.error("VIP me failed", err);
        if (!cancelled) setLoaded({ token, me: null });
      });
    return () => {
      cancelled = true;
    };
  }, [token, tick]);

  const me = token && loaded?.token === token ? loaded.me : null;
  if (!me || !me.capper) return null;

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
          <PriceLine key={me.seller.price_cents} seller={me.seller} onSaved={refresh} />
          <VipPickComposer me={me} onPosted={() => onChanged?.()} />
        </>
      ) : (
        <SellerSetupCard me={me} onDone={refresh} />
      )}
    </section>
  );
}
