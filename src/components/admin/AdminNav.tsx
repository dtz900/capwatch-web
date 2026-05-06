"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/review", label: "Review queue" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/cappers", label: "Cappers" },
  { href: "/admin/pipeline", label: "Pipeline" },
];

function isActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname() || "";
  return (
    <nav
      className="sticky top-0 z-30 backdrop-blur-md bg-[rgba(10,10,12,0.85)]
                 border-b border-[rgba(255,255,255,0.06)]"
    >
      <div className="max-w-[1240px] mx-auto px-7 h-16 flex items-center justify-between gap-4">
        <Link
          href="/admin/review"
          className="flex items-center gap-2 text-[var(--color-text)]"
          aria-label="TailSlips Admin"
        >
          <Image
            src="/logo-horizontal-aligned-tight.png"
            alt="TailSlips"
            width={1704}
            height={402}
            priority
            className="h-9 w-auto"
          />
          <span className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-gold)] font-extrabold border border-[var(--color-gold)] rounded px-1.5 py-0.5">
            Admin
          </span>
        </Link>

        <div className="hidden md:flex gap-1 ml-2 flex-1">
          {LINKS.map((l) => {
            const active = isActive(l.href, pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-md text-[12px] font-extrabold uppercase tracking-[0.10em] ${
                  active
                    ? "bg-[rgba(255,255,255,0.10)] text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.04)]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <Link
          href="/"
          className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-bold whitespace-nowrap"
        >
          ← Public site
        </Link>
      </div>

      <div className="md:hidden border-t border-[rgba(255,255,255,0.04)]">
        <div className="max-w-[1240px] mx-auto px-7 py-2 flex flex-wrap gap-1">
          {LINKS.map((l) => {
            const active = isActive(l.href, pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-[0.10em] ${
                  active
                    ? "bg-[rgba(255,255,255,0.10)] text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
