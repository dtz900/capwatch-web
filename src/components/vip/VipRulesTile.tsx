"use client";

import { useState } from "react";

/* The short version of /vip-rules, shown in place on the subscribe page so
 * the buyer never leaves checkout. Keep in step with /vip-rules. */
const RULES = [
  "Sellers start once they're up over their last 30 days on 20+ graded picks. They stay open as long as their last 30 days or last 60 days are up, checked every night with one day to recover.",
  "Every VIP pick is timestamped before the game and goes public 30 minutes after it starts.",
  "Mistakes can be fixed within 10 minutes, before the game. Subscribers see the original and get a new alert.",
  "Pulled picks stay listed and count as no action.",
  "If the capper loses eligibility for 7 days or posts no VIP picks for 14 days, your billing pauses and new subscriptions close until they are back.",
  "Graded by the same code as every capper. Not betting advice. 21+.",
];

const ICON =
  "M12 3v18M5 21h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0L6 7ZM18 7l-3 7a3 3 0 0 0 6 0l-3-7Z";

export function VipRulesTile({ className }: { className: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${className} sm:col-span-3`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center gap-3"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="w-6 h-6 shrink-0 text-[var(--color-vip-text)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={ICON} />
        </svg>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold text-[var(--color-text)]">
            How we keep it honest
          </span>
          <span className="block text-[12px] leading-snug text-[var(--color-text-muted)]">
            How sellers qualify and how every pick is graded.
          </span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`w-4 h-4 shrink-0 text-[var(--color-vip-text)] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className="mt-4 flex flex-col gap-2 border-t border-[rgba(255,255,255,0.07)] pt-4">
          {RULES.map((r) => (
            <li
              key={r}
              className="flex gap-2.5 text-[12px] leading-snug text-[var(--color-text-soft)]"
            >
              <span
                aria-hidden="true"
                className="mt-[6px] w-1.5 h-1.5 shrink-0 rounded-full bg-[var(--color-vip-text)]"
              />
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
