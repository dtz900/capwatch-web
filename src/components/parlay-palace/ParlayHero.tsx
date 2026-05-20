import type { PalaceEntry } from "@/lib/types";
import { formatUnits2 } from "@/lib/formatters";
import { CapperAvatar } from "./CapperAvatar";

// Card "art": full-bleed hero with a cinematic bottom scrim so the foil
// numeral never fights the subject. Gold-foil treatment, no neon.
export function ParlayHero({ entry }: { entry: PalaceEntry }) {
  const units = formatUnits2(entry.units_profit ?? 0);
  return (
    <div className="relative h-[336px] overflow-hidden bg-[#0b0d11]">
      {entry.hero_url && entry.hero_kind === "photo" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.hero_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : null}
      {entry.hero_url && entry.hero_kind === "clip" ? (
        <video
          src={entry.hero_url}
          controls
          playsInline
          muted
          preload="none"
          className="absolute inset-0 w-full h-full object-cover bg-[#0b0d11]"
        />
      ) : null}

      {/* cinematic scrim: clear at top, solid at base */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,17,0)_30%,rgba(11,13,17,0.35)_52%,rgba(11,13,17,0.82)_74%,#0b0d11_100%)]" />

      {/* kicker: tinted backdrop so the slate date stays legible over
          bright hero photos (sky / stadium lighting / pale uniforms) */}
      <div className="absolute top-4 left-4 rounded-md bg-[rgba(8,9,12,0.45)] backdrop-blur-[2px] px-2.5 py-1.5 ring-1 ring-[rgba(202,164,90,0.18)]">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#e3c787] font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          Parlay Palace
        </div>
        <div className="mt-1 h-px w-9 bg-[#caa45a]" />
        {entry.slate_date && (
          <div className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
            {entry.slate_date}
          </div>
        )}
      </div>

      {/* name plate */}
      <div className="absolute left-5 right-5 bottom-5">
        <div
          className="font-black tabular-nums leading-[0.9] tracking-[-0.035em] text-[64px]
                     bg-[linear-gradient(180deg,#fdf3d6_0%,#e9cf93_42%,#c7a259_100%)]
                     bg-clip-text text-transparent
                     [-webkit-text-fill-color:transparent]
                     drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
        >
          {units}
          <span className="text-[22px] align-top ml-1 [-webkit-text-fill-color:#c7a259]">
            u
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2.5 text-[11px] uppercase tracking-[0.18em] font-bold text-[rgba(255,255,255,0.78)]">
          {entry.capper_handle && (
            <div className="relative shrink-0">
              <CapperAvatar
                url={entry.body?.capper_image_url ?? null}
                handle={entry.capper_handle}
                size={42}
              />
              {/* Crown floats off the upper-left of the avatar, fully
                  outside the circle. Mirror of PalaceCard. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/parlay-palace-crown.png"
                alt=""
                aria-hidden
                width={36}
                height={36}
                className="pointer-events-none absolute w-9 h-9 object-contain"
                style={{
                  top: -30,
                  left: -34,
                  transform: "rotate(-26deg)",
                  mixBlendMode: "screen",
                  filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.65))",
                }}
              />
            </div>
          )}
          <span className="leading-tight">
            {entry.leg_count != null ? `${entry.leg_count}-Leg Parlay` : "Parlay"}
            {entry.combined_odds != null && (
              <span className="text-[rgba(255,255,255,0.5)]">
                {"  ·  "}+{entry.combined_odds}
              </span>
            )}
            {entry.capper_handle && (
              <span className="text-[#e3c787]">{"  ·  "}@{entry.capper_handle}</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
