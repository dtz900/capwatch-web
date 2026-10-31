"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { VipApiError, postVipSeller, startVipOnboarding } from "@/lib/vip/client";
import { SELLER_AGREEMENT_VERSION } from "@/lib/vip/terms";
import type { VipMe } from "@/lib/vip/types";
import { BOOKS, OTHER_BOOK } from "./builder/books";
import { VipBand, VipGlassCard } from "./VipBand";
import { joinSports } from "./format";
import { ERROR_TEXT, VIP_PRIMARY_BTN } from "./styles";

/** Capper's share: TailSlips keeps a flat 15% for everyone and absorbs processing. */
export const SELLER_SHARE = 0.85;

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
  "Start selling unlocks once a sport is eligible: 30+ graded picks, 5+ wins and +3% ROI over the last 30 days.";

export function SellerSetupCard({ me, onDone }: { me: VipMe; onDone: () => void }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [price, setPrice] = useState("");
  const [book, setBook] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dollars = parsePriceDollars(price);
  const canSubmit = dollars !== null && book !== "" && accepted && !pending && me.capper !== null &&
    me.payments_enabled;

  const submit = async () => {
    // Pending guards a double tap: the button disables on the next render.
    if (dollars === null || pending) return;
    setPending(true);
    setError(null);
    let created = false;
    try {
      await postVipSeller(
        {
          price_cents: dollars * 100,
          accept_terms: true,
          terms_version: SELLER_AGREEMENT_VERSION,
          preferred_book: book,
        },
        token,
      );
      created = true;
      const { url } = await startVipOnboarding(token);
      window.location.assign(url);
    } catch (err) {
      if (err instanceof VipApiError && err.status === 409) {
        setError("You need an eligible sport first: 30+ graded picks, 5+ wins and +3% ROI over the last 30 days.");
      } else if (err instanceof VipApiError && err.status === 403 && err.detail === "seller_denylisted") {
        setError("This account cannot sell VIP picks.");
      } else if (created) {
        // The seller row exists; the status banner offers Continue setup.
        console.error("VIP onboarding link failed", err);
        onDone();
        return;
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
          <BookSelect value={book} onChange={setBook} />
          <label className="flex items-start gap-2 text-[11px] leading-snug text-[var(--color-text-soft)]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <a
                href="/seller-agreement"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 text-[var(--color-text)]"
              >
                Seller Agreement
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </span>
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" className={VIP_PRIMARY_BTN} disabled={!canSubmit} onClick={submit}>
              Start selling
            </button>
            {!me.payments_enabled && (
              <span role="status" className="text-[11px] text-[var(--color-text-muted)]">
                Payments aren&apos;t open yet.
              </span>
            )}
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

function BookSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="vip-seller-book" className="text-[11px] font-semibold text-[var(--color-text-soft)]">
        Your main book
      </label>
      <select
        id="vip-seller-book"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full sm:w-56 px-2.5 text-[13px] rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text)] focus:outline-none focus:border-[rgba(255,255,255,0.20)]"
      >
        <option value="" disabled className="bg-[#0e0e12]">
          Choose a book
        </option>
        {BOOKS.map((b) => (
          <option key={b.id} value={b.id} className="bg-[#0e0e12]">
            {b.name}
          </option>
        ))}
        <option value={OTHER_BOOK} className="bg-[#0e0e12]">
          Other book
        </option>
      </select>
      <span className="text-[10px] text-[var(--color-text-muted)]">Your picks prefill at this book. Change it on any pick.</span>
    </div>
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
