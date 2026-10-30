"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { VipApiError, postVipSeller } from "@/lib/vip/client";
import type { VipMe } from "@/lib/vip/types";
import { VipBand, VipGlassCard } from "./VipBand";
import { joinSports } from "./format";
import { ERROR_TEXT, VIP_PRIMARY_BTN } from "./styles";

export const TERMS_SENTENCE =
  "I understand I can start selling in a sport after a positive last 30 days there and keep selling only while my last 60 days there stay positive, that VIP picks are revealed to everyone 30 minutes after the game starts, and that TailSlips keeps 15% of each subscription, with payment processing fees coming out of the TailSlips share.";

/** Capper's share: TailSlips keeps a flat 15% for everyone and absorbs processing. */
const SELLER_SHARE = 0.85;

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

  const eligible = me.eligibility.filter((e) => e.eligible).map((e) => String(e.sport));
  if (eligible.length === 0) {
    return (
      <VipGlassCard>
        <VipBand compact showRule={false} headline="Not eligible to sell yet" />
        <p role="status" className="px-4 py-3 text-[12px] text-[var(--color-text-soft)]">
          {REQUIREMENT_LINE}
        </p>
      </VipGlassCard>
    );
  }

  // Full profile width: the form on the left, what selling means on the
  // right, so the card reads as one deliberate panel instead of a narrow
  // form stranded on a wide band. Stacks below lg.
  return (
    <VipGlassCard>
      <VipBand compact showRule={false} headline={`Start selling ${joinSports(eligible)} VIP picks`} />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-t border-[rgba(255,255,255,0.08)]">
        <div className="px-4 sm:px-5 py-4 flex flex-col gap-4">
          <div className="flex items-end gap-5 flex-wrap">
            <PriceInput id="vip-seller-price" value={price} onChange={setPrice} />
            <KeepLine dollars={dollars} />
          </div>
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
            <button type="button" className={VIP_PRIMARY_BTN} disabled={!canSubmit} onClick={submit}>
              Start selling
            </button>
            {error && (
              <span role="status" className={ERROR_TEXT}>
                {error}
              </span>
            )}
          </div>
        </div>
        <HowItWorks />
      </div>
    </VipGlassCard>
  );
}

/** What the capper takes home per subscriber at the typed price. */
function KeepLine({ dollars }: { dollars: number | null }) {
  if (dollars === null) {
    return <span className="sm:pb-6 text-[11px] text-[var(--color-text-muted)]">You keep 85% of every subscription.</span>;
  }
  const keep = (dollars * SELLER_SHARE).toFixed(2);
  return (
    <span className="sm:pb-6 text-[12px] text-[var(--color-text-soft)]">
      You keep <span className="font-extrabold text-[var(--color-text)] tabular-nums">${keep}</span> of each ${dollars}{" "}
      subscription, every month.
    </span>
  );
}

const HOW_IT_WORKS: { title: string; body: string }[] = [
  { title: "Post inside TailSlips", body: "Your subscribers see the pick the moment you post it and get an email." },
  { title: "Public 30 minutes after start", body: "Then everyone can see it, and it grades on your record like any other pick." },
  { title: "Sell while you are winning", body: "Selling opens on a winning last 30 days and stays open while your last 60 days are positive." },
];

function HowItWorks() {
  return (
    <ol className="px-4 sm:px-5 py-4 flex flex-col gap-3 border-t lg:border-t-0 lg:border-l border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.12)]">
      {HOW_IT_WORKS.map((s, i) => (
        <li key={s.title} className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-vip-soft)] text-[11px] font-extrabold text-[var(--color-vip-text)] tabular-nums">
            {i + 1}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px] font-bold text-[var(--color-text)]">{s.title}</span>
            <span className="text-[12px] leading-snug text-[var(--color-text-soft)]">{s.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
