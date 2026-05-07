"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NavSearch } from "@/components/nav/NavSearch";

const LINKS = [
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
          {LINKS.map((l) => {
            const active = isActive(l.href, pathname);
            const cls = active
              ? "text-[var(--color-text)] bg-[rgba(255,255,255,0.05)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]";
            return (
              <Link
                key={l.label}
                href={l.href}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold ${cls}`}
                aria-current={active ? "page" : undefined}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <NavSearch />
        </div>
      </div>
    </nav>
  );
}
