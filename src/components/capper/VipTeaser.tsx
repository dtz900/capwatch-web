"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export function VipTeaser() {
  const { entitlements } = useAuth();
  return (
    <section className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-5 py-5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-gold)]">VIP</div>
      <p className="mt-1 text-sm text-[var(--color-text)]">
        See which parts of this record are skill and which are luck: closing line
        value, de-lucked ROI by market, and trust signals on every capper.
      </p>
      <Link
        href={entitlements.isLoggedIn ? "/account" : "/login"}
        className="mt-3 inline-block rounded-lg border border-[var(--color-border-h)] px-3 py-1.5 text-sm text-[var(--color-text)]"
      >
        {entitlements.isLoggedIn ? "Upgrade to VIP" : "Sign in to get started"}
      </Link>
    </section>
  );
}
