"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { vipEnabled } from "@/lib/flags";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNewTailPicks } from "@/lib/useTailsNotif";

const TABS: { href: string; label: string; icon: () => React.JSX.Element; gold?: boolean }[] = [
  { href: "/parlay-palace", label: "Palace", icon: CrownIcon, gold: true },
  { href: "/slate", label: "Slate", icon: SlateIcon },
  { href: "/", label: "Leaderboard", icon: LeaderboardIcon },
  { href: "/cappers", label: "Cappers", icon: CappersIcon },
  { href: "/methodology", label: "Methodology", icon: MethodologyIcon },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CrownIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 18 L4 11 L7 6 L9 10 L12 4 L15 10 L17 6 L20 11 L20 18 Z" />
      <path d="M4 14 L20 14" />
    </svg>
  );
}

function SlateIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M9 4v16" />
    </svg>
  );
}

function LeaderboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 21V11" />
      <path d="M12 21V3" />
      <path d="M18 21v-7" />
    </svg>
  );
}

function CappersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}

function MethodologyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20l9-9-9-9-9 9 9 9z" />
      <path d="M12 13v3" />
    </svg>
  );
}

function MyTailsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h12v18l-6-4.5L6 21z" />
    </svg>
  );
}

export function MobileTabBar() {
  const pathname = usePathname() || "/";
  const { entitlements } = useAuth();
  const flagOn = vipEnabled();
  const newTailPicks = useNewTailPicks();

  let tabs = TABS;
  if (flagOn) {
    tabs = TABS.filter((t) => t.href !== "/methodology");
    if (entitlements.isLoggedIn) {
      tabs = [...tabs, { href: "/my-tails", label: "My Tails", icon: MyTailsIcon }];
    }
  }

  return (
    <nav
      role="navigation"
      aria-label="Primary"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40
                 backdrop-blur-md bg-[rgba(10,10,12,0.97)]
                 border-t border-[rgba(255,255,255,0.06)]
                 pb-[env(safe-area-inset-bottom)]"
    >
      <div className={`grid h-14 ${tabs.length === 4 ? "grid-cols-4" : "grid-cols-5"}`}>
        {tabs.map((t) => {
          const active = isActive(t.href, pathname);
          const Icon = t.icon;
          const cls = t.gold
            ? "text-[#caa45a]"
            : active
              ? "text-[#60a5fa]"
              : "text-[var(--color-text-muted)]";
          return (
            <Link
              key={t.label}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-0 ${cls}`}
            >
              <span className="relative">
                <Icon />
                {t.href === "/my-tails" && newTailPicks && (
                  <span
                    className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#2fd9c0]"
                    aria-label="New picks from your tails"
                  />
                )}
              </span>
              <span className="text-[10px] font-semibold leading-none">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
