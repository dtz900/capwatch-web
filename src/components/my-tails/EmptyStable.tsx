"use client";
import Link from "next/link";
import type { CapperRow } from "@/lib/types";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { TailButton } from "@/components/auth/TailButton";
import { formatUnits } from "@/lib/formatters";

export function EmptyStable({ suggestions }: { suggestions: CapperRow[] }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-[var(--color-text)]">Build your stable.</h2>
      <p className="mt-1 text-sm text-[var(--color-text-soft)]">
        Tail your first capper and their record shows up here.
      </p>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {suggestions.map((c) => (
          <div
            key={c.capper_id}
            className="rounded-2xl bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d] border border-[var(--color-border)] px-5 py-5"
          >
            <Link href={`/cappers/${c.handle}`} className="flex items-center gap-3">
              <CapperAvatar url={c.profile_image_url} handle={c.handle} size={40} />
              <div className="min-w-0">
                <div className="font-bold text-[var(--color-text)] truncate">
                  {c.display_name ?? c.handle}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">@{c.handle}</div>
              </div>
            </Link>
            <div className="mt-3 text-2xl font-extrabold tabular-nums text-[var(--color-pos)]">
              {formatUnits(c.units_profit)}
            </div>
            <div className="mt-3">
              <TailButton capperId={Number(c.capper_id)} size="compact" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
