"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getVipMe, patchVipSeller } from "@/lib/vip/client";
import type { VipMe, VipSeller } from "@/lib/vip/types";
import { formatPrice } from "./format";
import { PriceInput, SellerSetupCard, parsePriceDollars } from "./SellerSetupCard";
import { PickBuilder } from "./builder/PickBuilder";
import { ERROR_TEXT, EYEBROW, INNER_CARD, PRIMARY_BTN, SECONDARY_BTN, SECONDARY_BTN_SM, SECTION, VIP_PRIMARY_BTN } from "./styles";

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
      <div className={`${INNER_CARD} flex items-center gap-3 flex-wrap`}>
        <div className="flex items-baseline gap-3">
          <span className={EYEBROW}>Selling at</span>
          <span className="text-[18px] font-extrabold tabular-nums leading-none text-[var(--color-text)]">
            ${formatPrice(seller.price_cents)}/mo
          </span>
          <span aria-hidden="true" className="text-[var(--color-text-muted)]">
            ·
          </span>
        </div>
        <button
          type="button"
          className={SECONDARY_BTN_SM}
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
    <div className={`${INNER_CARD} flex items-end gap-3 flex-wrap`}>
      <PriceInput id="vip-seller-price-edit" value={price} onChange={setPrice} />
      <button
        type="button"
        className={PRIMARY_BTN}
        disabled={dollars === null || pending}
        onClick={save}
      >
        Save
      </button>
      <button
        type="button"
        className={SECONDARY_BTN}
        onClick={() => setEditing(false)}
      >
        Cancel
      </button>
      {error && (
        <span role="status" className={ERROR_TEXT}>
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

/** The board stays closed until the capper asks for it, so their own
 *  profile reads like everyone else's on a normal visit. */
function BuilderToggle({ me, token, onPosted }: { me: VipMe; token: string; onPosted: () => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className={`${VIP_PRIMARY_BTN} self-start`} onClick={() => setOpen(true)}>
        Post a VIP pick
      </button>
    );
  }
  return (
    <>
      <button
        type="button"
        className="self-end text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        onClick={() => setOpen(false)}
      >
        Close pick builder
      </button>
      <PickBuilder
        token={token}
        eligibleSports={me.can_post_sports}
        preferredBook={me.seller?.preferred_book}
        onPosted={onPosted}
      />
    </>
  );
}

/** Presentational owner panel for a loaded /me. `composerToken` lets the
 *  fixtures page show the builder without a signed-in session. */
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
  const { session } = useAuth();
  const token = composerToken ?? session?.access_token ?? null;
  // Not selling yet: the purple setup card IS the dashboard, so it sits
  // under the label on its own rather than boxed inside another card.
  if (!me.seller) {
    return (
      <section aria-label="Your VIP dashboard" className="flex flex-col gap-2.5">
        <span className={EYEBROW}>Your VIP dashboard</span>
        <SellerSetupCard me={me} onDone={onRefresh} />
      </section>
    );
  }
  return (
    <section className={`${SECTION} flex flex-col gap-4`}>
      <span className={EYEBROW}>Your VIP dashboard</span>
      <PriceLine key={me.seller.price_cents} seller={me.seller} onSaved={onRefresh} />
      {me.can_post_sports.length === 0 ? (
        <p className="text-[12px] text-[var(--color-text-muted)]">You can post VIP picks once a sport is eligible.</p>
      ) : (
        token && <BuilderToggle me={me} token={token} onPosted={onPosted} />
      )}
    </section>
  );
}
