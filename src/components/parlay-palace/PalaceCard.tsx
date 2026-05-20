import Link from "next/link";
import type { PalaceEntry } from "@/lib/types";
import { formatUnits2 } from "@/lib/formatters";
import { CapperAvatar } from "./CapperAvatar";

const FRAME_GRADIENT =
  "linear-gradient(135deg,#caa45a 0%,#f3e3b3 22%,#9c7a36 46%,#e9cf93 68%,#8a6e3a 100%)";

export function PalaceCard({ entry }: { entry: PalaceEntry }) {
  const units = formatUnits2(entry.units_profit ?? 0);
  const avatarUrl = entry.body?.capper_image_url ?? null;
  return (
    <Link
      href={`/parlay-palace/${entry.slug}`}
      aria-label={`${units}u parlay by @${entry.capper_handle ?? "unknown"}`}
      className="group block rounded-[14px] p-[1.5px] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-16px_rgba(0,0,0,0.65)]"
      style={{ background: FRAME_GRADIENT }}
    >
      <div className="rounded-[12.5px] overflow-hidden bg-[#0c0e13]">
        <div className="relative h-44 bg-[linear-gradient(140deg,#1a1306,#0c0e13_70%)]">
          {entry.hero_url && entry.hero_kind !== "clip" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.hero_url}
              alt=""
              className="w-full h-44 object-cover opacity-95 group-hover:opacity-100 transition-opacity"
            />
          ) : null}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(8,7,4,0.55) 70%,rgba(8,7,4,0.95) 100%)",
            }}
          />
          {/* Diagonal gold gleam sweeps on hover. Listens to the parent
              Link's `group` class. CSS file scopes the motion to
              prefers-reduced-motion users. */}
          <span aria-hidden className="palace-card-glint" />
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <div
              className="font-extrabold text-[28px] leading-none tabular-nums tracking-tight"
              style={{
                background:
                  "linear-gradient(180deg,#f3e3b3 0%,#caa45a 55%,#8a6e3a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "0 1px 0 rgba(0,0,0,0.25)",
              }}
            >
              {`${units}u`}
            </div>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="relative shrink-0">
            <CapperAvatar
              url={avatarUrl}
              handle={entry.capper_handle}
              size={44}
            />
            {/* Gold crown floats off the upper-left of the avatar, tilted
                so it reads as a heraldic mark next to the headshot rather
                than a hat sitting on it. Positioned fully outside the
                circle. mix-blend-mode: screen drops the source PNG's
                black background. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/parlay-palace-crown.png"
              alt=""
              aria-hidden
              width={36}
              height={36}
              className="pointer-events-none absolute w-9 h-9 object-contain"
              style={{
                top: -22,
                left: -26,
                transform: "rotate(-24deg)",
                mixBlendMode: "screen",
                filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.65))",
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-white truncate">
              @{entry.capper_handle ?? "unknown"}
            </div>
            <div className="text-[11px] text-[rgba(255,255,255,0.42)] mt-0.5 truncate">
              {[
                entry.leg_count != null ? `${entry.leg_count}-leg` : null,
                entry.combined_odds != null ? `+${entry.combined_odds}` : null,
                entry.slate_date ?? null,
              ].filter(Boolean).join(" · ")}
            </div>
          </div>
          <span
            aria-hidden
            className="text-[9px] font-extrabold tracking-[0.18em] uppercase shrink-0"
            style={{ color: "#caa45a" }}
          >
            View
          </span>
        </div>
      </div>
    </Link>
  );
}
