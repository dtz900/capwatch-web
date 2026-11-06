"use client";

import { useState } from "react";
import { avatarSrc } from "@/lib/avatarSrc";
import type { BackRow, MarketRow, NcaabCard } from "@/lib/ncaab-slate";
import { StatusChip, deriveLifecycle } from "./StatusChip";
import { TeamLogo } from "./TeamLogo";

const CHIP =
  "inline-flex items-center rounded-md bg-[rgba(255,255,255,0.04)] ring-1 ring-inset ring-[rgba(255,255,255,0.08)]";

function MarketLine({ row, awayColor, homeColor }: { row: MarketRow; awayColor: string; homeColor: string }) {
  // Spread sides wear their team color when leading; totals stay off-white.
  const leftColor = row.label === "SPREAD" ? awayColor : "var(--color-text)";
  const rightColor = row.label === "SPREAD" ? homeColor : "var(--color-text)";
  const { left, right } = row;
  return (
    <div className="py-2.5 border-b border-[var(--color-border)]">
      <div className="text-[9px] font-extrabold tracking-[0.16em] text-[var(--color-text-muted)] mb-1">{row.label}</div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-2.5 text-[14px] font-extrabold">
        <span className="truncate" style={{ color: left.lead ? leftColor : "var(--color-text-muted)" }}>
          {left.text}
          {left.note && <span className="ml-1 text-[10px] font-semibold text-[var(--color-text-muted)]">{left.note}</span>}
        </span>
        <span className="whitespace-nowrap tabular-nums" aria-label={`${left.n} to ${right.n}`}>
          <span className={left.lead ? "text-[var(--color-text)]" : "text-[#52525b]"}>{left.n}</span>
          <span className="mx-[5px] text-[#3f3f46]">·</span>
          <span className={right.lead ? "text-[var(--color-text)]" : "text-[#52525b]"}>{right.n}</span>
        </span>
        <span className="truncate text-right" style={{ color: right.lead ? rightColor : "var(--color-text-muted)" }}>
          {right.text}
          {right.note && <span className="ml-1 text-[10px] font-semibold text-[var(--color-text-muted)]">{right.note}</span>}
        </span>
      </div>
    </div>
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
        <span className="px-1.5 py-0.5 rounded ring-1 ring-inset ring-[rgba(255,255,255,0.14)] text-[10px] font-bold text-[var(--color-text-soft)] whitespace-nowrap">
          {r.price}
        </span>
      </div>
    </>
  );
}

export function NcaabFlipCard({ card, initialOpen = false }: { card: NcaabCard; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const g = card.game;
  const sharps = `${card.cappers} ${card.cappers === 1 ? "SHARP" : "SHARPS"}`;
  const label = `${card.away} at ${card.home}, ${sharps.toLowerCase()}, ${card.pickCount} ${card.pickCount === 1 ? "pick" : "picks"}. Show all picks`;

  return (
    <div className="ncaab-flip" data-open={open} data-ncaab-game={g.game_id} id={`game-${g.game_id}`}>
      <div className="ncaab-flip-inner">
        <button
          type="button"
          className="ncaab-face m-0 p-0 w-full text-left cursor-pointer font-[inherit] text-[var(--color-text)] hover:border-[var(--color-border-h)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text)]"
          onClick={() => setOpen(true)}
          aria-label={label}
          aria-expanded={open}
          inert={open}
        >
          <div className="h-full box-border flex flex-col">
            <div className="px-3 pt-3 flex justify-between items-center">
              <StatusChip lifecycle={deriveLifecycle(g)} game={g} gameTime={g.game_time} />
              <span className={`${CHIP} px-[9px] py-1 text-[10px] font-extrabold tracking-[0.16em] whitespace-nowrap`}>
                {sharps}
              </span>
            </div>
            <div className="px-3.5 pt-3 pb-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <TeamLogo abbr={card.away} sport="NCAAB" logoUrl={card.awayLogo} color={card.awayColor} size={32} flat />
                <div className="min-w-0">
                  <div className="text-[19px] font-extrabold tracking-[-0.02em]" style={{ color: card.awayColor }}>
                    {card.away}
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--color-text-muted)] truncate">{card.awayName}</div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#52525b]">@</span>
              <div className="flex items-center gap-2 min-w-0 flex-row-reverse text-right">
                <TeamLogo abbr={card.home} sport="NCAAB" logoUrl={card.homeLogo} color={card.homeColor} size={32} flat />
                <div className="min-w-0">
                  <div className="text-[19px] font-extrabold tracking-[-0.02em]" style={{ color: card.homeColor }}>
                    {card.home}
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--color-text-muted)] truncate">{card.homeName}</div>
                </div>
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
                  <span className="text-[11px] font-semibold text-[var(--color-text-muted)] whitespace-nowrap ml-auto">
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
        </button>

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
              type="button"
              onClick={() => setOpen(false)}
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
          <div className="ncaab-rows flex-1 overflow-y-auto px-3 pt-0.5 pb-2.5" tabIndex={open ? 0 : -1} aria-label="All picks on this game">
            {card.rows.map((r) => (
              <PickRow key={r.key} r={r} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
