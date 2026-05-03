"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/slate", label: "Slate", icon: SlateIcon },
  { href: "/", label: "Leaderboard", icon: LeaderboardIcon },
  { href: "/cappers", label: "Cappers", icon: CappersIcon },
  { href: "/methodology", label: "Methodology", icon: MethodologyIcon },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
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

export function MobileTabBar() {
  const pathname = usePathname() || "/";
  return (
    <nav
      role="navigation"
      aria-label="Primary"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40
                 backdrop-blur-md bg-[rgba(10,10,12,0.85)]
                 border-t border-[rgba(255,255,255,0.06)]
                 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex h-14">
        {TABS.map((t) => {
          const active = isActive(t.href, pathname);
          const Icon = t.icon;
          const cls = active
            ? "text-[#60a5fa]"
            : "text-[var(--color-text-muted)]";
          return (
            <Link
              key={t.label}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${cls}`}
            >
              <Icon />
              <span className="text-[10px] font-semibold leading-none">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
