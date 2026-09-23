"use client";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { xAuthEnabled } from "@/lib/flags";

/* Starts the X identity link on the signed-in account. One OAuth round trip:
   X asks to authorize TailSlips, the callback lands on `returnTo`, and
   AuthProvider runs the claim. Login itself never goes through X, so every
   account keeps an email. */
export function VerifyWithX({
  returnTo,
  label = "Verify with X",
  className = "",
}: {
  returnTo: string;
  label?: string;
  className?: string;
}) {
  const { linkX, session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!xAuthEnabled() || !session) return null;

  async function start() {
    setBusy(true);
    setError(null);
    const err = await linkX(returnTo);
    if (err) {
      setError(/manual linking/i.test(err) ? "Verification is not available right now." : err);
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border-h)] text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text)] disabled:opacity-60"
      >
        <span aria-hidden="true" className="text-[13px] font-black">𝕏</span>
        {busy ? "Opening X" : label}
      </button>
      {error && <p className="mt-1.5 text-[11px] text-[var(--color-neg)]">{error}</p>}
    </div>
  );
}
