"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { VipApiError, postVipSeller } from "@/lib/vip/client";
import type { VipMe } from "@/lib/vip/types";
import { ERROR_TEXT, PRIMARY_BTN } from "./styles";

export const TERMS_SENTENCE =
  "I understand I can only sell while my public TailSlips record is positive in that sport over the last 30 days, that VIP picks are revealed to everyone 30 minutes after the game starts, and that TailSlips keeps 15% of each subscription (10% for founding sellers).";

export const PRICE_MIN = 10;
export const PRICE_MAX = 99;

/** Whole dollars between $10 and $99, or null. "25" -> 25, "25.5" -> null. */
export function parsePriceDollars(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= PRICE_MIN && n <= PRICE_MAX ? n : null;
}

export function PriceInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[11px] font-semibold text-[var(--color-text-soft)]">
        Monthly price (USD)
      </label>
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] font-bold text-[var(--color-text-soft)]">$</span>
        <input
          id={id}
          inputMode="numeric"
          className="w-20 h-10 px-2.5 text-[13px] rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text)] focus:outline-none focus:border-[rgba(255,255,255,0.20)]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <span className="text-[10px] text-[var(--color-text-muted)]">Between $10 and $99.</span>
    </div>
  );
}

export const REQUIREMENT_LINE =
  "Start selling unlocks once a sport is eligible: a positive record over the last 30 days with at least 20 graded picks.";

export function SellerSetupCard({ me, onDone }: { me: VipMe; onDone: () => void }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [price, setPrice] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dollars = parsePriceDollars(price);
  const canSubmit = dollars !== null && accepted && !pending && me.capper !== null;

  const submit = async () => {
    if (dollars === null) return;
    setPending(true);
    setError(null);
    try {
      await postVipSeller({ price_cents: dollars * 100, accept_terms: true }, token);
      onDone();
    } catch (err) {
      if (err instanceof VipApiError && err.status === 409) {
        setError("You need a positive 30-day record in at least one sport first.");
      } else if (err instanceof VipApiError && err.status === 403 && err.detail === "seller_denylisted") {
        setError("This account cannot sell VIP picks.");
      } else {
        console.error("VIP seller create failed", err);
        setError("Could not start selling. Try again.");
      }
    } finally {
      setPending(false);
    }
  };

  if (!me.eligibility.some((e) => e.eligible)) {
    return (
      <p role="status" className="text-[12px] text-[var(--color-text-soft)]">
        {REQUIREMENT_LINE}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[15px] font-extrabold text-[var(--color-text)]">Sell your picks as VIP</div>
      <PriceInput id="vip-seller-price" value={price} onChange={setPrice} />
      <label className="flex items-start gap-2 text-[11px] leading-snug text-[var(--color-text-soft)]">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>{TERMS_SENTENCE}</span>
      </label>
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" className={PRIMARY_BTN} disabled={!canSubmit} onClick={submit}>
          Start selling
        </button>
        {error && (
          <span role="status" className={ERROR_TEXT}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
