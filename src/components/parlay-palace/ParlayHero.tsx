import type { PalaceEntry } from "@/lib/types";
import { formatUnits2 } from "@/lib/formatters";

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

      {/* kicker */}
      <div className="absolute top-5 left-5">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#e3c787] font-extrabold">
          Parlay Palace
        </div>
        <div className="mt-1 h-px w-9 bg-[#caa45a]" />
        {entry.slate_date && (
          <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.62)] font-bold">
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
        <div className="mt-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[rgba(255,255,255,0.78)]">
          {entry.leg_count != null ? `${entry.leg_count}-Leg Parlay` : "Parlay"}
          {entry.combined_odds != null && (
            <span className="text-[rgba(255,255,255,0.5)]">
              {"  ·  "}+{entry.combined_odds}
            </span>
          )}
          {entry.capper_handle && (
            <span className="text-[#e3c787]">{"  ·  "}@{entry.capper_handle}</span>
          )}
        </div>
      </div>
    </div>
  );
}
