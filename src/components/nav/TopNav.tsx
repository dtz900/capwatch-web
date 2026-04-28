import Link from "next/link";
import { LogoMark } from "./LogoMark";
import { SearchIcon } from "@/components/icons/SearchIcon";

const LINKS = [
  { href: "/slate", label: "Slate", disabled: true },
  { href: "/", label: "Leaderboard", active: true },
  { href: "/cappers", label: "Cappers", disabled: true },
  { href: "/methodology", label: "Methodology" },
];

export function TopNav() {
  return (
    <nav className="sticky top-0 z-30 backdrop-blur-md bg-[rgba(10,10,12,0.85)]
                    border-b border-[rgba(255,255,255,0.06)]">
      <div className="max-w-[1240px] mx-auto px-7 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-[11px] text-[var(--color-text)]">
          <LogoMark />
          <span className="font-extrabold text-[15px] tracking-[0.20em]">CAPWATCH</span>
        </Link>
        <div className="flex gap-1 mx-6">
          {LINKS.map((l) => {
            const cls = l.active
              ? "text-[var(--color-text)] bg-[rgba(255,255,255,0.05)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]";
            return (
              <Link key={l.label} href={l.disabled ? "#" : l.href}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold ${cls}`}
                    aria-disabled={l.disabled}>
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 flex items-center justify-center
                             border border-[rgba(255,255,255,0.06)] rounded-lg
                             text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  aria-label="Search">
            <SearchIcon />
          </button>
        </div>
      </div>
    </nav>
  );
}
