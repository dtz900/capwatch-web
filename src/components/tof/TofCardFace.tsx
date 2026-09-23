"use client";
import type { DeckCard } from "@/components/tof/TofDeck";
import { StreakBadge } from "@/components/leaderboard/StreakBadge";

const TAG: Record<string, { label: string; color: string }> = {
  contested: { label: "CONTESTED", color: "#f5c54a" },
  heater: { label: "HEATER", color: "#19f57c" },
  cold: { label: "ICE COLD", color: "#ef4444" },
  wolf: { label: "FIELD VS WOLF", color: "#60a5fa" },
  wildcard: { label: "WILDCARD", color: "#c4b5fd" },
  stable: { label: "YOUR TAIL", color: "#d4d4d8" },
};

export function fmtOdds(o: number | null | undefined): string {
  if (o == null) return "";
  return o > 0 ? `+${o}` : String(o);
}

function startLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" }) + " PT";
}

export function TofCardFace({
  card, stampTail = 0, stampFade = 0, locked = false,
}: {
  card: DeckCard;
  stampTail?: number;
  stampFade?: number;
  locked?: boolean;
}) {
  const category = card.kind === "stable" ? "stable" : card.category;
  const tag = TAG[category] ?? TAG.wildcard;
  const shared = card.kind === "shared" ? card : null;
  const fadeLabel = shared?.fade_label ?? null;
  const unpriced = shared?.fade_odds_source === "no_close_available";
  return (
    <div className="relative flex h-full flex-col gap-3.5 overflow-hidden rounded-xl border border-[var(--color-border)] bg-gradient-to-b from-[#17171d] via-[#101015] to-[#0b0b0e] p-5 select-none">
      <div className="pointer-events-none absolute left-5 top-6 rotate-[-14deg] rounded-lg border-[3px] border-[var(--color-pos)] px-3 py-1 text-[26px] font-extrabold tracking-[0.12em] text-[var(--color-pos)]" style={{ opacity: stampTail }}>TAIL</div>
      <div className="pointer-events-none absolute right-5 top-6 rotate-[14deg] rounded-lg border-[3px] border-[var(--color-neg)] px-3 py-1 text-[26px] font-extrabold tracking-[0.12em] text-[var(--color-neg)]" style={{ opacity: stampFade }}>FADE</div>

      <div className="flex items-center justify-between">
        <span className="rounded-md border px-2 py-1 text-[10px] font-extrabold tracking-[0.14em]" style={{ color: tag.color, borderColor: `${tag.color}55`, background: `${tag.color}14` }}>{tag.label}</span>
        <span className="text-[11px] font-bold text-[var(--color-text-muted)]">{locked ? "LOCKED" : startLabel(card.game_start_at)}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border-h)] bg-[#26262e] text-[12px] font-extrabold text-[var(--color-text-soft)]">
          {card.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.profile_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            (card.handle ?? "?").slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-extrabold">@{card.handle}</span>
            <StreakBadge streak={card.capper_streak} size="xs" />
          </div>
          {card.capper_record && <div className="text-[11px] text-[var(--color-text-soft)]">{card.capper_record}</div>}
        </div>
      </div>

      <div className="flex flex-grow flex-col items-center justify-center gap-2 border-y border-[var(--color-border)] py-4 text-center">
        <div className="text-[10px] font-bold tracking-[0.04em] text-[var(--color-text-muted)]">{card.matchup}</div>
        <div className="text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em]">{card.tail_label}</div>
        <div className="text-[24px] font-extrabold leading-none text-[var(--color-text-soft)] tabular-nums">{fmtOdds(card.tail_odds)}</div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">{card.market_group}</div>
        {shared && shared.game_state !== "scheduled" && shared.home_score != null && (
          <div className="mt-1 text-[12px] font-bold text-[var(--color-text-soft)] tabular-nums">
            {shared.away_score} - {shared.home_score} · {shared.game_state === "final" ? "FINAL" : "LIVE"}
          </div>
        )}
      </div>

      <div className="flex items-start gap-2.5">
        <div className="w-[3px] self-stretch rounded-sm" style={{ background: tag.color }} />
        <div className="text-[11.5px] leading-[1.45] text-[var(--color-text-soft)]">{card.note}</div>
      </div>

      <div className="flex justify-between text-[10px] font-extrabold tracking-[0.14em] text-[#52525b]">
        <span>{fadeLabel ? `← FADE · ${fadeLabel}${unpriced ? " (unpriced)" : ""}` : "PASS OR TAIL"}</span>
        <span>TAIL →</span>
      </div>

      {shared?.crowd && (
        <div className="absolute inset-x-5 bottom-14 flex items-center justify-between text-[10px] font-bold text-[var(--color-text-muted)]">
          <span><span className="text-[var(--color-pos)]">{shared.crowd.tail_pct}%</span> tailed</span>
          <span><span className="text-[var(--color-neg)]">{shared.crowd.fade_pct}%</span> faded</span>
        </div>
      )}
    </div>
  );
}
