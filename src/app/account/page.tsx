"use client";
import { useState } from "react";
import { notFound } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { vipEnabled } from "@/lib/flags";

export default function AccountPage() {
  const { entitlements, session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard after hooks per branch convention
  if (!vipEnabled()) notFound();

  async function upgrade() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const body = await res.json();
    if (res.ok && body.url) window.location.href = body.url;
    else {
      setError(body.error ?? "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  if (!entitlements.isLoggedIn) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center text-[var(--color-text-soft)]">
        Sign in at <a href="/login" className="underline">/login</a> to manage your account.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-6 py-6">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Account</h1>
        <p className="mt-1 text-sm text-[var(--color-text-soft)]">{session?.user?.email}</p>
        <div className="mt-4 text-sm text-[var(--color-text)]">
          Plan:{" "}
          <span className={entitlements.isVip ? "text-[var(--color-gold)] font-semibold" : ""}>
            {entitlements.isVip ? "VIP" : "Free"}
          </span>
        </div>
        {!entitlements.isVip && (
          <>
            <p className="mt-4 text-sm text-[var(--color-text-soft)]">
              VIP unlocks closing line value, de-lucked ROI by market, and trust
              signals on every capper.
            </p>
            <button
              onClick={upgrade}
              disabled={busy}
              className="mt-3 rounded-lg bg-[var(--color-text)] text-black font-semibold px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy ? "Redirecting..." : "Upgrade to VIP"}
            </button>
            {error && <p className="mt-2 text-sm text-[var(--color-neg)]">{error}</p>}
          </>
        )}
      </div>
    </main>
  );
}
