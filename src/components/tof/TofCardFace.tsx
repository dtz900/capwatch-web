"use client";
import type { DeckCard } from "@/components/tof/TofDeck";
import { StreakBadge } from "@/components/leaderboard/StreakBadge";
import { TeamLogo } from "@/components/slate/TeamLogo";
import { teamColor } from "@/lib/teams";
import type { Sport } from "@/lib/types";

export const CATEGORY: Record<string, { label: string; color: string }> = {
  contested: { label: "CONTESTED", color: "#f5c54a" },
  heater: { label: "HEATER", color: "#fb923c" },
  cold: { label: "ICE COLD", color: "#7dd3fc" },
  wolf: { label: "FIELD VS WOLF", color: "#c4b5fd" },
  wildcard: { label: "WILDCARD", color: "#19f57c" },
  stable: { label: "YOUR TAIL", color: "#d4d4d8" },
};

/** Team color pulled most of the way to the page black, for a card wash that stays dark. */
function deepTone(hex: string, keep = 0.42): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return "#17171d";
  const mix = (v: number, base: number) => Math.round(v * keep + base * (1 - keep)).toString(16).padStart(2, "0");
  return `#${mix(parseInt(m[1], 16), 0x0c)}${mix(parseInt(m[2], 16), 0x0c)}${mix(parseInt(m[3], 16), 0x10)}`;
}

export function fmtOdds(o: number | null | undefined): string {
  if (o == null) return "";
  return o > 0 ? `+${o}` : String(o);
}

function startLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" }) + " PT";
}

/** "NYM @ TEX" -> { away: "NYM", home: "TEX" }. */
function splitMatchup(matchup: string): { away: string | null; home: string | null } {
  const m = matchup.split("@").map((s) => s.trim());
  return m.length === 2 ? { away: m[0] || null, home: m[1] || null } : { away: null, home: null };
}

/** The team a side label names, if it names one ("TEX ML", "NYY -1.5"); totals name none. */
function sideTeam(label: string | null, teams: (string | null)[]): string | null {
  if (!label) return null;
  const first = label.split(" ")[0]?.toUpperCase();
  return teams.find((t) => t && t.toUpperCase() === first) ?? null;
}


export function TofCardFace({
  card, stampTail = 0, stampFade = 0, stampPass = 0, locked = false,
}: {
  card: DeckCard;
  stampTail?: number;
  stampFade?: number;
  stampPass?: number;
  locked?: boolean;
}) {
  const category = card.kind === "stable" ? "stable" : card.category;
  const tag = CATEGORY[category] ?? CATEGORY.wildcard;
  const shared = card.kind === "shared" ? card : null;
  const sport = (card.sport ?? "MLB") as Sport;
  const { away, home } = splitMatchup(card.matchup);
  const tailTeam = sideTeam(card.tail_label, [away, home]);
  const fadeLabel = shared?.fade_label ?? null;
  const unpriced = shared?.fade_odds_source === "no_close_available";
  const fadeOdds = shared ? shared.fade_odds_at_deal : null;
  const tailColor = tailTeam ? teamColor(tailTeam, sport) : "#19f57c";
  // The card carries the capper's team as a deep wash at the top, so a stack reads as different cards.
  const wash = deepTone(tailColor);
  const live = shared && shared.game_state !== "scheduled" && shared.home_score != null && shared.away_score != null;
  const final = shared?.game_state === "final";

  return (
    <div
      className="relative flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.10)] p-4 select-none"
      // The gradient must not tile into the border strip (a repeat there shows the wash color
      // as a 1px line along the bottom edge), so it is clipped to the padding box and not repeated.
      style={{ backgroundImage: `linear-gradient(180deg, ${wash} 0%, #121217 46%, #0b0b0e 100%)`, backgroundClip: "padding-box", backgroundOrigin: "border-box", backgroundRepeat: "no-repeat" }}
    >
      <div className="pointer-events-none absolute left-5 top-8 z-20 rotate-[-14deg] rounded-lg border-[3px] border-[var(--color-pos)] bg-[rgba(10,10,12,0.7)] px-3 py-1 font-[family-name:var(--font-display)] text-[30px] tracking-[0.1em] text-[var(--color-pos)]" style={{ opacity: stampTail }}>TAIL</div>
      <div className="pointer-events-none absolute left-1/2 top-[38%] z-20 -translate-x-1/2 rotate-[-6deg] rounded-lg border-[3px] border-[#a1a1aa] bg-[rgba(10,10,12,0.75)] px-4 py-1 font-[family-name:var(--font-display)] text-[30px] tracking-[0.1em] text-[#d4d4d8]" style={{ opacity: stampPass }}>PASS</div>
      <div className="pointer-events-none absolute right-5 top-8 z-20 rotate-[14deg] rounded-lg border-[3px] border-[var(--color-neg)] bg-[rgba(10,10,12,0.7)] px-3 py-1 font-[family-name:var(--font-display)] text-[30px] tracking-[0.1em] text-[var(--color-neg)]" style={{ opacity: stampFade }}>FADE</div>

      <div className="relative flex items-center justify-between text-[10px] font-extrabold tracking-[0.16em]">
        <span style={{ color: tag.color }}>{tag.label}{locked && live ? <span className="ml-2 text-[var(--color-text-muted)]">LOCKED</span> : null}</span>
        {live ? (
          <span className="flex items-center gap-1.5 tabular-nums text-[var(--color-text-soft)]">
            {!final && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-pos)]" />}
            <span>{away} {shared!.away_score}</span>
            <span className="text-[var(--color-text-muted)]">·</span>
            <span>{shared!.home_score} {home}</span>
            <span className="ml-1 text-[var(--color-text-muted)]">{final ? "FINAL" : "LIVE"}</span>
          </span>
        ) : (
          <span className="text-[var(--color-text-muted)]">{locked ? "LOCKED" : startLabel(card.game_start_at)}</span>
        )}
      </div>

      {/* The capper is the subject of the card. */}
      <div className="relative flex items-center gap-3 pt-1">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[rgba(255,255,255,0.14)] bg-[#26262e] text-[14px] font-extrabold text-[var(--color-text-soft)]">
          {card.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.profile_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            (card.handle ?? "?").slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[19px] font-extrabold leading-tight tracking-[-0.02em]">@{card.handle}</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-[var(--color-text-soft)]">
            <StreakBadge streak={card.capper_streak} size="xs" />
            {card.capper_record && <span className="truncate">{card.capper_record}</span>}
          </div>
        </div>
      </div>

      {/* Their pick: one team, big. */}
      <div className="relative flex flex-grow flex-col justify-center gap-3">
        <div className="text-[9px] font-extrabold tracking-[0.2em] text-[var(--color-text-muted)]">{card.kind === "stable" ? "YOUR TAIL" : "THE PICK"} · {card.matchup}</div>
        <div className="flex items-center gap-4">
          <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full bg-[#ece7d9] shadow-[0_6px_16px_rgba(0,0,0,0.45)]">
            {tailTeam ? <TeamLogo abbr={tailTeam} sport={sport} size={60} flat /> : (
              <span className="font-[family-name:var(--font-display)] text-[24px] text-[#0a0a0c]">{card.tail_label.split(" ")[0]?.toUpperCase().slice(0, 3)}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[34px] font-extrabold leading-none tracking-[-0.03em]">{card.tail_label}</div>
            <div className="mt-1.5 text-[18px] font-extrabold tabular-nums text-[var(--color-pos)]">{fmtOdds(card.tail_odds)}</div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">{card.market_group}</div>
          </div>
        </div>
        {fadeLabel && (
          <div className="flex items-center gap-2 text-[12px] font-bold text-[var(--color-text-soft)]">
            <span className="text-[9px] font-extrabold tracking-[0.2em] text-[var(--color-neg)]">FADE</span>
            <span>{fadeLabel}</span>
            <span className="tabular-nums text-[var(--color-text-muted)]">{unpriced ? "unpriced" : fmtOdds(fadeOdds) || "at the close"}</span>
          </div>
        )}
      </div>

      <div className="relative flex items-start gap-2.5">
        <div className="w-[3px] self-stretch rounded-sm" style={{ background: tag.color }} />
        <div className="text-[11.5px] leading-[1.45] text-[var(--color-text-soft)]">{card.note}</div>
      </div>

      {shared?.crowd && (
        <div className="relative">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
            <div className="bg-[var(--color-neg)]" style={{ width: `${shared.crowd.fade_pct}%` }} />
            <div className="bg-[var(--color-pos)]" style={{ width: `${shared.crowd.tail_pct}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-bold text-[var(--color-text-muted)]">
            <span><span className="text-[var(--color-neg)]">{shared.crowd.fade_pct}%</span> faded</span>
            <span>{shared.crowd.plays} plays</span>
            <span><span className="text-[var(--color-pos)]">{shared.crowd.tail_pct}%</span> tailed</span>
          </div>
        </div>
      )}
    </div>
  );
}
