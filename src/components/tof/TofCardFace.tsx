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

function SideMark({ team, label, sport, color }: { team: string | null; label: string; sport: Sport; color: string }) {
  if (team) return <TeamLogo abbr={team} sport={sport} size={66} />;
  const word = label.split(" ")[0]?.toUpperCase() ?? "";
  return (
    <div className="flex h-[66px] w-[66px] items-center justify-center rounded-full border-2 text-[13px] font-extrabold tracking-[0.06em]" style={{ borderColor: color, color }}>
      {word === "OVER" ? "OVR" : word === "UNDER" ? "UND" : word.slice(0, 3)}
    </div>
  );
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
  const fadeTeam = sideTeam(fadeLabel, [away, home]) ?? (tailTeam ? (tailTeam === away ? home : away) : null);
  const unpriced = shared?.fade_odds_source === "no_close_available";
  const fadeOdds = shared ? shared.fade_odds_at_deal : null;
  const tailColor = tailTeam ? teamColor(tailTeam, sport) : "#19f57c";
  const fadeColor = fadeTeam ? teamColor(fadeTeam, sport) : "#ef4444";
  // Each card carries its tail team: a deep wash at the top and a big faded logo, so a
  // stack of cards reads as different cards, the way photos do on a dating deck.
  const wash = deepTone(tailColor);
  const identityTeam = tailTeam ?? fadeTeam;
  const live = shared && shared.game_state !== "scheduled" && shared.home_score != null && shared.away_score != null;
  const final = shared?.game_state === "final";

  return (
    <div
      className="relative flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.10)] bg-clip-padding p-4 select-none"
      style={{ background: `linear-gradient(180deg, ${wash} 0%, #121217 46%, #0b0b0e 100%)` }}
    >
      {identityTeam && (
        <div aria-hidden="true" className="pointer-events-none absolute -right-6 bottom-6 opacity-[0.13]" style={{ transform: "rotate(-12deg)", maskImage: "linear-gradient(180deg, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 92%)", WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 92%)" }}>
          <TeamLogo abbr={identityTeam} sport={sport} size={230} flat />
        </div>
      )}
      {/* Team-tinted corners: the two sides of the card carry their team colors at low alpha. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle at 12% 62%, ${fadeColor}2e 0%, transparent 42%), radial-gradient(circle at 88% 62%, ${tailColor}2e 0%, transparent 42%)` }}
      />

      <div className="pointer-events-none absolute left-5 top-8 z-20 rotate-[-14deg] rounded-lg border-[3px] border-[var(--color-pos)] bg-[rgba(10,10,12,0.7)] px-3 py-1 font-[family-name:var(--font-display)] text-[30px] tracking-[0.1em] text-[var(--color-pos)]" style={{ opacity: stampTail }}>TAIL</div>
      <div className="pointer-events-none absolute left-1/2 top-[38%] z-20 -translate-x-1/2 rotate-[-6deg] rounded-lg border-[3px] border-[#a1a1aa] bg-[rgba(10,10,12,0.75)] px-4 py-1 font-[family-name:var(--font-display)] text-[30px] tracking-[0.1em] text-[#d4d4d8]" style={{ opacity: stampPass }}>PASS</div>
      <div className="pointer-events-none absolute right-5 top-8 z-20 rotate-[14deg] rounded-lg border-[3px] border-[var(--color-neg)] bg-[rgba(10,10,12,0.7)] px-3 py-1 font-[family-name:var(--font-display)] text-[30px] tracking-[0.1em] text-[var(--color-neg)]" style={{ opacity: stampFade }}>FADE</div>

      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="rounded-md border px-2 py-1 text-[10px] font-extrabold tracking-[0.14em]" style={{ color: tag.color, borderColor: `${tag.color}66`, background: `${tag.color}1a` }}>{tag.label}</span>
          {locked && live && <span className="rounded-md border border-[rgba(255,255,255,0.12)] px-1.5 py-1 text-[9px] font-extrabold tracking-[0.14em] text-[var(--color-text-muted)]">LOCKED</span>}
        </span>
        {live ? (
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-border-h)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] font-extrabold tabular-nums">
            {!final && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-pos)]" />}
            <span>{away} {shared!.away_score}</span>
            <span className="text-[var(--color-text-muted)]">·</span>
            <span>{shared!.home_score} {home}</span>
            <span className="ml-1 text-[9px] tracking-[0.12em] text-[var(--color-text-muted)]">{final ? "FINAL" : "LIVE"}</span>
          </span>
        ) : (
          <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] font-extrabold tracking-[0.08em] text-[var(--color-text-muted)]">{locked ? "LOCKED" : startLabel(card.game_start_at)}</span>
        )}
      </div>

      <div className="relative flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border-h)] bg-[#26262e] text-[11px] font-extrabold text-[var(--color-text-soft)]">
          {card.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.profile_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            (card.handle ?? "?").slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-extrabold">@{card.handle}</span>
            <StreakBadge streak={card.capper_streak} size="xs" />
          </div>
          {card.capper_record && <div className="text-[11px] text-[var(--color-text-soft)]">{card.capper_record}</div>}
        </div>
      </div>

      {/* The two sides. Left is the fade, right is the tail: same directions as the swipe. */}
      <div className="relative grid flex-grow grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-2 py-3">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <SideMark team={fadeTeam} label={fadeLabel ?? "PASS"} sport={sport} color={fadeColor} />
          <div className="text-[9px] font-extrabold tracking-[0.16em] text-[var(--color-neg)]">FADE</div>
          <div className="text-[19px] font-extrabold leading-none tracking-[-0.02em]">{fadeLabel ?? "n/a"}</div>
          <div className="text-[13px] font-extrabold tabular-nums text-[var(--color-text-soft)]">{fadeLabel ? (unpriced ? "unpriced" : fmtOdds(fadeOdds) || "close") : ""}</div>
          {shared?.rival && (
            <div className="mt-0.5 max-w-full truncate rounded-full border border-[rgba(245,197,74,0.35)] bg-[rgba(245,197,74,0.08)] px-2 py-0.5 text-[9.5px] font-bold text-[var(--color-gold)]">@{shared.rival.handle} {fmtOdds(shared.rival.odds)}</div>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="font-[family-name:var(--font-display)] text-[26px] leading-none text-[var(--color-text-muted)]">VS</div>
          <div className="text-[9px] font-bold tracking-[0.08em] text-[#52525b]">{card.market_group.toUpperCase()}</div>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <SideMark team={tailTeam} label={card.tail_label} sport={sport} color={tailColor} />
          <div className="text-[9px] font-extrabold tracking-[0.16em] text-[var(--color-pos)]">TAIL</div>
          <div className="text-[19px] font-extrabold leading-none tracking-[-0.02em]">{card.tail_label}</div>
          <div className="text-[13px] font-extrabold tabular-nums text-[var(--color-text-soft)]">{fmtOdds(card.tail_odds)}</div>
          <div className="mt-0.5 max-w-full truncate rounded-full border border-[rgba(25,245,124,0.3)] bg-[rgba(25,245,124,0.08)] px-2 py-0.5 text-[9.5px] font-bold text-[var(--color-pos)]">@{card.handle}</div>
        </div>
      </div>

      <div className="relative flex items-start gap-2.5">
        <div className="w-[3px] self-stretch rounded-sm" style={{ background: tag.color }} />
        <div className="text-[11.5px] leading-[1.45] text-[var(--color-text-soft)]">{card.note}</div>
      </div>

      {shared?.crowd ? (
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
      ) : unpriced ? (
        <div className="relative text-[10px] font-bold tracking-[0.08em] text-[var(--color-text-muted)]">Fade is unpriced on this card: it never moves units.</div>
      ) : null}
    </div>
  );
}
