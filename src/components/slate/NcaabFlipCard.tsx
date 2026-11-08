"use client";

import { useEffect, useRef, useState } from "react";
import { avatarSrc } from "@/lib/avatarSrc";
import type { BackRow, MarketRow, NcaabCard, Winner } from "@/lib/ncaab-slate";
import { OutcomeBadge } from "./OutcomeBadge";
import { StatusChip, deriveLifecycle } from "./StatusChip";
import { TeamLogo } from "./TeamLogo";

const CHIP =
  "inline-flex items-center rounded-md bg-[rgba(255,255,255,0.04)] ring-1 ring-inset ring-[rgba(255,255,255,0.08)]";

const DIM = "#52525b";

function Check() {
  return (
    <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="inline-block -mt-px shrink-0">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function MarketLine({ row, awayColor, homeColor }: { row: MarketRow; awayColor: string; homeColor: string }) {
  // Spread sides wear their team color when leading; totals stay off-white.
  const leftColor = row.label === "SPREAD" ? awayColor : "var(--color-text)";
  const rightColor = row.label === "SPREAD" ? homeColor : "var(--color-text)";
  const { left, right, result } = row;
  // Pre-game and live: the side with more sharps is bright. Final: the side
  // that cashed is bright with a check, the other side dims, and each count
  // turns green or red so the row reads "3 sharps won, 2 lost".
  const settled = result != null;
  const leftOn = settled ? result === "left" : left.lead;
  const rightOn = settled ? result === "right" : right.lead;
  const countColor = (on: boolean, n: number) => {
    if (n === 0) return DIM;
    if (!settled) return on ? "var(--color-text)" : DIM;
    if (result === "push") return "var(--color-text-muted)";
    return on ? "var(--color-pos)" : "var(--color-neg)";
  };
  const sideText = (on: boolean, color: string) => (settled ? (on ? color : DIM) : on ? color : "var(--color-text-muted)");
  return (
    <div className="py-2.5 border-b border-[var(--color-border)]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] font-extrabold tracking-[0.16em] text-[var(--color-text-muted)]">{row.label}</span>
        {result === "push" && (
          <span className="text-[9px] font-extrabold tracking-[0.16em] text-[var(--color-text-muted)] px-1.5 rounded ring-1 ring-inset ring-[rgba(255,255,255,0.14)]">
            PUSH
          </span>
        )}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-2.5 text-[14px] font-extrabold">
        <span className="truncate flex items-center gap-1.5" style={{ color: sideText(leftOn, leftColor) }}>
          {settled && leftOn && <Check />}
          <span className="truncate">{left.text}</span>
          {left.note && <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">{left.note}</span>}
        </span>
        <span className="whitespace-nowrap tabular-nums" role="group" aria-label={`${left.n} to ${right.n}`}>
          <span style={{ color: countColor(leftOn, left.n) }}>{left.n}</span>
          <span className="mx-[5px] text-[#3f3f46]">·</span>
          <span style={{ color: countColor(rightOn, right.n) }}>{right.n}</span>
        </span>
        <span className="truncate flex items-center justify-end gap-1.5 text-right" style={{ color: sideText(rightOn, rightColor) }}>
          {right.note && <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">{right.note}</span>}
          <span className="truncate">{right.text}</span>
          {settled && rightOn && <Check />}
        </span>
      </div>
    </div>
  );
}

function Score({ value, side, winner, color }: { value: number | null; side: "away" | "home"; winner: Winner | null; color: string }) {
  // Live: both scores off-white. Final: the winner wears its team color, the loser dims.
  const tone = winner == null || winner === "tie" ? "var(--color-text)" : winner === side ? color : DIM;
  return (
    <span className="text-[26px] font-extrabold tabular-nums leading-none tracking-[-0.02em]" style={{ color: tone }}>
      {value ?? "\u2014"}
    </span>
  );
}

function PickRow({ r }: { r: BackRow }) {
  const src = avatarSrc(r.avatar, 64);
  return (
    <>
      {r.head && (
        <div className="text-[9px] font-extrabold tracking-[0.16em] text-[var(--color-text-muted)] pt-2.5 pb-1">
          {r.group}
        </div>
      )}
      <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2 py-[5px]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" width={22} height={22} loading="lazy" className="w-[22px] h-[22px] rounded-full object-cover bg-[rgba(255,255,255,0.06)]" />
        ) : (
          <span
            aria-hidden
            className="w-[22px] h-[22px] rounded-full bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)] text-[10px] font-extrabold flex items-center justify-center"
          >
            {r.handle.replace(/^@/, "").charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <div className="text-[10px] font-semibold text-[#a1a1aa] truncate">{r.handle}</div>
          <div className="text-[12px] font-bold text-[var(--color-text)] truncate">{r.bet}</div>
        </div>
        <span className="flex items-center gap-1.5">
          {r.outcome && <OutcomeBadge outcome={r.outcome} profitUnits={r.parlay ? null : r.profit} />}
          <span className="px-1.5 py-0.5 rounded ring-1 ring-inset ring-[rgba(255,255,255,0.14)] text-[10px] font-bold text-[var(--color-text-soft)] whitespace-nowrap">
            {r.price}
          </span>
        </span>
      </div>
    </>
  );
}

export function NcaabFlipCard({ card, initialOpen = false }: { card: NcaabCard; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const frontRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const toggled = useRef(false);
  // Flipping inerts the face that had focus, so hand focus to the visible
  // face's button: Back when opening, the flip button when closing.
  useEffect(() => {
    if (!toggled.current) return;
    (open ? backRef.current : frontRef.current)?.focus();
  }, [open]);
  const flip = (next: boolean) => {
    toggled.current = true;
    setOpen(next);
  };
  const g = card.game;
  const lifecycle = deriveLifecycle(g);
  const tipped = lifecycle !== "pre";
  const sharps = `${card.cappers} ${card.cappers === 1 ? "SHARP" : "SHARPS"}`;
  const label = `Show all ${card.pickCount} ${card.pickCount === 1 ? "pick" : "picks"} on ${card.away} at ${card.home}`;

  return (
    <div
      className="ncaab-flip"
      data-open={open}
      data-ncaab-game={g.game_id}
      id={`game-${g.game_id}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          flip(false);
        }
      }}
    >
      <div className="ncaab-flip-inner">
        <div className="ncaab-face ncaab-face-front text-left text-[var(--color-text)] hover:border-[var(--color-border-h)]" inert={open}>
          {/* The summary below is plain, readable content. This button sits behind
              it and takes the click; its label is short because the text is
              already there to read. */}
          <button
            ref={frontRef}
            type="button"
            className="absolute inset-0 w-full h-full m-0 p-0 border-0 bg-transparent cursor-pointer rounded-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text)]"
            onClick={() => flip(true)}
            aria-label={label}
            aria-expanded={open}
          />
          <div className="relative pointer-events-none min-h-[298px] box-border flex flex-col">
            <div className="px-3 pt-3 flex justify-between items-center">
              <StatusChip lifecycle={lifecycle} game={g} gameTime={g.game_time} />
              <span className={`${CHIP} px-[9px] py-1 text-[10px] font-extrabold tracking-[0.16em] whitespace-nowrap`}>
                {sharps}
              </span>
            </div>
            <div className="px-3.5 pt-3 pb-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <TeamLogo abbr={card.away} sport="NCAAB" logoUrl={card.awayLogo} color={card.awayColor} size={32} flat />
                <div className="min-w-0">
                  <div className="text-[19px] font-extrabold tracking-[-0.02em]" style={{ color: card.awayColor }}>
                    {card.away}
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--color-text-muted)] truncate">{card.awayName}</div>
                </div>
                {tipped && (
                  <span className="ml-auto pl-1">
                    <Score value={card.awayScore} side="away" winner={card.winner} color={card.awayColor} />
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-[#52525b]">{tipped ? "" : "@"}</span>
              <div className="flex items-center gap-2 min-w-0 flex-row-reverse text-right">
                <TeamLogo abbr={card.home} sport="NCAAB" logoUrl={card.homeLogo} color={card.homeColor} size={32} flat />
                <div className="min-w-0">
                  <div className="text-[19px] font-extrabold tracking-[-0.02em]" style={{ color: card.homeColor }}>
                    {card.home}
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--color-text-muted)] truncate">{card.homeName}</div>
                </div>
                {tipped && (
                  <span className="mr-auto pr-1">
                    <Score value={card.homeScore} side="home" winner={card.winner} color={card.homeColor} />
                  </span>
                )}
              </div>
            </div>
            <div className="flex h-[2px]" aria-hidden>
              <div className="flex-1" style={{ background: card.awayColor }} />
              <div className="flex-1" style={{ background: card.homeColor }} />
            </div>
            <div className="px-3.5 pt-1">
              <MarketLine row={card.spread} awayColor={card.awayColor} homeColor={card.homeColor} />
              <MarketLine row={card.total} awayColor={card.awayColor} homeColor={card.homeColor} />
              {card.biggest && (
                <div className="flex items-baseline gap-2 pt-2.5 min-w-0">
                  <span className="text-[12px] font-extrabold text-[var(--color-gold)] whitespace-nowrap">{card.biggest.units}</span>
                  <span className="text-[12px] font-bold text-[var(--color-text)] truncate min-w-0">{card.biggest.bet}</span>
                  {card.biggest.outcome && (
                    <span className="self-center ml-auto">
                      <OutcomeBadge outcome={card.biggest.outcome} profitUnits={card.biggest.profit} />
                    </span>
                  )}
                  <span className={`text-[11px] font-semibold text-[var(--color-text-muted)] whitespace-nowrap ${card.biggest.outcome ? "" : "ml-auto"}`}>
                    {card.biggest.who}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-auto px-3 pt-2.5 pb-3 flex justify-between items-center gap-2">
              <div className="flex gap-[5px] flex-wrap">
                {card.chips.map((c) => (
                  <span key={c} className={`${CHIP} px-[7px] py-[3px] text-[10px] font-bold text-[var(--color-text-soft)]`}>
                    {c}
                  </span>
                ))}
              </div>
              <span className="flex items-center gap-[5px] text-[10px] font-extrabold tracking-[0.14em] text-[#a1a1aa] whitespace-nowrap">
                {card.pickCount} {card.pickCount === 1 ? "PICK" : "PICKS"}
                <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        <div className="ncaab-face ncaab-face-back flex flex-col" inert={!open} aria-hidden={!open}>
          <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3">
            <div className="flex items-center gap-[7px] min-w-0">
              <TeamLogo abbr={card.away} sport="NCAAB" logoUrl={card.awayLogo} color={card.awayColor} size={20} flat />
              <span className="text-[13px] font-extrabold" style={{ color: card.awayColor }}>{card.away}</span>
              <span className="text-[10px] font-bold text-[#52525b]">@</span>
              <span className="text-[13px] font-extrabold" style={{ color: card.homeColor }}>{card.home}</span>
              <TeamLogo abbr={card.home} sport="NCAAB" logoUrl={card.homeLogo} color={card.homeColor} size={20} flat />
            </div>
            <button
              ref={backRef}
              type="button"
              onClick={() => flip(false)}
              aria-label="Back to summary"
              className="w-11 h-8 rounded-[7px] border-0 bg-[rgba(255,255,255,0.04)] ring-1 ring-inset ring-[rgba(255,255,255,0.08)] text-[var(--color-text-soft)] cursor-pointer flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text)]"
            >
              <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="flex h-[2px]" aria-hidden>
            <div className="flex-1" style={{ background: card.awayColor }} />
            <div className="flex-1" style={{ background: card.homeColor }} />
          </div>
          <div className="ncaab-rows flex-1 overflow-y-auto px-3 pt-0.5 pb-2.5" role="region" tabIndex={open ? 0 : -1} aria-label="All picks on this game">
            {card.rows.map((r) => (
              <PickRow key={r.key} r={r} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
