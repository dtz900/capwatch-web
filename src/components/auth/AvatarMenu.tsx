"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { vipTierEnabled } from "@/lib/flags";
import { useAuth } from "@/components/auth/AuthProvider";

export function AvatarMenu() {
  const { session, entitlements, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!entitlements.isLoggedIn) {
    return (
      <Link
        href="/login"
        className="rounded-lg border border-[var(--color-border-h)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text)] hover:bg-white/5"
      >
        Sign in
      </Link>
    );
  }

  const initial = (session?.user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-[#26262c] to-[#141418] border border-[var(--color-border-h)] text-sm font-bold text-[var(--color-text)]"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-44 rounded-xl bg-[#121216] border border-[var(--color-border-h)] shadow-xl py-1.5">
          <div className="px-3 py-1.5 text-xs text-[var(--color-text-muted)] truncate">
            {session?.user?.email}
          </div>
          {vipTierEnabled() &&
            (entitlements.isVip ? (
              <div className="px-3 py-1.5 text-sm font-semibold text-[var(--color-gold)]">VIP</div>
            ) : (
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="block px-3 py-1.5 text-sm text-[var(--color-gold)] hover:bg-white/5"
              >
                Go VIP
              </Link>
            ))}
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-white/5"
          >
            Account
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              void signOut().catch(console.error);
            }}
            className="block w-full text-left px-3 py-1.5 text-sm text-[var(--color-text-soft)] hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
