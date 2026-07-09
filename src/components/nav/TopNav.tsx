"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NavSearch } from "@/components/nav/NavSearch";
import { vipEnabled } from "@/lib/flags";
import { AvatarMenu } from "@/components/auth/AvatarMenu";
import { useAuth } from "@/components/auth/AuthProvider";

const BASE_LINKS: { href: string; label: string; gold?: boolean }[] = [
  { href: "/parlay-palace", label: "Parlay Palace", gold: true },
  { href: "/slate", label: "Slate" },
  { href: "/", label: "Leaderboard" },
  { href: "/cappers", label: "Cappers" },
  { href: "/methodology", label: "Methodology" },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname() || "/";
  const flagOn = vipEnabled();
  const { entitlements } = useAuth();

  const links = flagOn
    ? [
        ...BASE_LINKS.filter((l) => l.label !== "Methodology"),
        ...(entitlements.isLoggedIn ? [{ href: "/my-tails", label: "My Tails" }] : []),
      ]
    : BASE_LINKS;

  return (
    <nav
      className="sticky top-0 z-30 backdrop-blur-md bg-[rgba(10,10,12,0.85)]
                    border-b border-[rgba(255,255,255,0.06)]"
    >
      <div className="max-w-[1240px] mx-auto px-7 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center text-[var(--color-text)]" aria-label="TailSlips home">
          <Image
            src="/logo-horizontal-aligned-tight.png"
            alt="TailSlips"
            width={1704}
            height={402}
            priority
            className="h-9 w-auto"
          />
        </Link>
        <div className="hidden sm:flex gap-1 mx-6">
          {links.map((l) => {
            const active = isActive(l.href, pathname);
            // Active = a colored underline, not a boxed background.
            // Parlay Palace gets a gold underline + gold text always;
            // other links get a brand-green underline + white text on
            // active, muted otherwise.
            const accentColor = l.gold ? "#caa45a" : "var(--color-text)";
            const textColor = l.gold
              ? "#caa45a"
              : active
                ? "var(--color-text)"
                : "var(--color-text-muted)";
            return (
              <Link
                key={l.label}
                href={l.href}
                className="px-3.5 py-2 text-sm font-semibold transition-colors hover:text-white"
                style={{
                  color: textColor,
                  textDecoration: active ? "underline" : undefined,
                  textUnderlineOffset: active ? "8px" : undefined,
                  textDecorationThickness: active ? "2px" : undefined,
                  textDecorationColor: active ? accentColor : undefined,
                }}
                aria-current={active ? "page" : undefined}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <NavSearch />
          {flagOn && <AvatarMenu />}
        </div>
      </div>
    </nav>
  );
}
