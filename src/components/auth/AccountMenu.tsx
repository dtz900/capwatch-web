"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export function AccountMenu() {
  const { entitlements, signOut, session } = useAuth();
  if (!entitlements.isLoggedIn) {
    return (
      <Link
        href="/login"
        className="rounded-lg border border-[var(--color-border-h)] px-3 py-1.5 text-sm text-[var(--color-text)]"
      >
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link href="/my-cappers" className="text-[var(--color-text-soft)] hover:text-[var(--color-text)]">
        My Cappers
      </Link>
      <Link href="/account" className="text-[var(--color-text-soft)] hover:text-[var(--color-text)]">
        {entitlements.isVip ? "VIP" : "Account"}
      </Link>
      <button
        onClick={() => signOut()}
        title={session?.user?.email ?? ""}
        className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        Sign out
      </button>
    </div>
  );
}
