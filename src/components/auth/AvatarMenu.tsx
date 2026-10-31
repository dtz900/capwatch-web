"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { vipTierEnabled } from "@/lib/flags";
import { useAuth } from "@/components/auth/AuthProvider";
import { BoardAvatar } from "@/components/tof/BoardAvatar";
import { displayAvatar } from "@/lib/x-claim";
import { getVipMe } from "@/lib/vip/client";

export function AvatarMenu() {
  const { session, profile, entitlements, capper, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // An owner linked in the database (not through X) has no capper on the
  // session; ask the platform once, the first time the menu opens.
  // Tagged with the user it belongs to, so an account switch asks again.
  const [owned, setOwned] = useState<{ userId: string; handle: string | null } | null>(null);
  const asked = useRef<string | null>(null);
  const userId = session?.user?.id ?? null;
  const token = session?.access_token ?? null;
  useEffect(() => {
    if (!open || capper || !userId || asked.current === userId) return;
    asked.current = userId;
    getVipMe(token)
      .then((m) => setOwned({ userId, handle: m.capper?.handle ?? null }))
      .catch((err: unknown) => console.warn("owned capper lookup failed", err));
  }, [open, capper, userId, token]);
  const profileHandle = capper?.handle ?? (owned?.userId === userId ? owned.handle : null);

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

  const username = profile?.username ?? null;
  // Same photo as the board and hero: tracked capper photo, then upload,
  // then the initial.
  const avatar = displayAvatar(profile, capper);
  const name = username ?? session?.user?.email ?? "?";

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border-h)] bg-gradient-to-b from-[#26262c] to-[#141418] text-sm font-bold text-[var(--color-text)]"
      >
        {avatar ? <BoardAvatar url={avatar} name={name} size={30} /> : <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-44 rounded-xl bg-[#121216] border border-[var(--color-border-h)] shadow-xl py-1.5">
          <div className="px-3 py-1.5 text-xs text-[var(--color-text-muted)] truncate">
            {username ? `@${username}` : session?.user?.email}
          </div>
          {profileHandle && (
            <Link
              href={`/cappers/${encodeURIComponent(profileHandle)}`}
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-white/5"
            >
              My profile
            </Link>
          )}
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
          {/* Methodology left the main nav when My Tails took its slot; the
              avatar menu and the footer disclaimer keep it reachable. */}
          <Link
            href="/methodology"
            onClick={() => setOpen(false)}
            className="block px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-white/5"
          >
            Methodology
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
