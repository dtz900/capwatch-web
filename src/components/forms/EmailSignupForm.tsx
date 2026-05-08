"use client";

import { useState } from "react";
import { submitEmailSignup } from "@/lib/api";

interface Props {
  source: string;
  /** Headline shown above the form. */
  heading?: string;
  /** Sub-copy shown below the heading. */
  subheading?: string;
}

type Status = "idle" | "submitting" | "ok" | "invalid" | "error";

export function EmailSignupForm({
  source,
  heading = "Get the weekly TailSlips recap",
  subheading = "Sharps to watch, biggest wins, no spam. Cancel any time.",
}: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    const result = await submitEmailSignup({ email, source });
    if (result === "ok") {
      setStatus("ok");
      setEmail("");
    } else if (result === "invalid_email") {
      setStatus("invalid");
    } else {
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <div className="max-w-[460px] text-center text-[12px] text-[var(--color-text-soft)]">
        Thanks. You are on the list.
      </div>
    );
  }

  return (
    <div className="w-full max-w-[460px]">
      <div className="text-center mb-3">
        <div className="text-[13px] font-bold text-[var(--color-text)] mb-1">{heading}</div>
        <div className="text-[11px] text-[var(--color-text-muted)] font-medium">{subheading}</div>
      </div>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== "idle" && status !== "submitting") setStatus("idle");
          }}
          placeholder="you@example.com"
          aria-label="Email address"
          className="flex-1 min-w-0 rounded-md bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)]
                     px-3 py-2 text-[13px] text-[var(--color-text)]
                     placeholder:text-[var(--color-text-muted)]
                     focus:outline-none focus:border-[rgba(255,255,255,0.30)] transition-colors"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="shrink-0 rounded-md bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)]
                     border border-[rgba(255,255,255,0.10)]
                     px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em] text-[var(--color-text)]
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? "..." : "Join"}
        </button>
      </form>
      {status === "invalid" && (
        <div className="mt-2 text-[11px] text-[#f87171] text-center">That email did not look right. Try again.</div>
      )}
      {status === "error" && (
        <div className="mt-2 text-[11px] text-[#f87171] text-center">Something went wrong. Try again in a minute.</div>
      )}
    </div>
  );
}
