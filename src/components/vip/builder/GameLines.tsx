"use client";

import { useContext, useState } from "react";
import { EYEBROW } from "@/components/vip/styles";
import type { BoardSide } from "@/lib/vip/types";
import { PERIODS, nearAlts, teamName, type BuilderGame, type Period } from "./adapt";
import { MoreLink, NoPrice, PeriodCtx, PriceButton, TeamCell, type TapFn } from "./ui";

type MoreView = null | "altSpreads" | "altTotals" | "teamTotals";

export function GameLines({ g, selected, onTap }: { g: BuilderGame; selected: Set<string>; onTap: TapFn }) {
  const period: Period = useContext(PeriodCtx);
  const [more, setMore] = useState<MoreView>(null);
  const [allAlts, setAllAlts] = useState(false);
  // Thin games only have the full game posted yet. Never stand full-game prices
  // in for a period: the tap would post a full-game pick under a period header.
  const L = g.thin && period !== "Game" ? undefined : g.periods[period];
  const btn = (sd: BoardSide) => (
    <PriceButton key={sd.key} side={sd} selected={selected.has(sd.key)} onTap={() => onTap(sd, g.id)} />
  );
  const cell = (pair: [BoardSide, BoardSide] | null | undefined, i: 0 | 1) => (pair ? btn(pair[i]) : <NoPrice />);
  const toggle = (v: MoreView) => {
    setMore(more === v ? null : v);
    setAllAlts(false);
  };
  // Books post dozens of alt rungs; open on the ones near the main line.
  const altGrid = (sides: BoardSide[], main: number | null) => {
    const near = nearAlts(sides, g.away, main);
    const shown = allAlts ? sides : near;
    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{shown.map(btn)}</div>
        {near.length < sides.length && (
          <button
            type="button"
            onClick={() => setAllAlts(!allAlts)}
            className="self-start text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            {allAlts ? "Fewer lines" : `Show all ${sides.length}`}
          </button>
        )}
      </>
    );
  };
  const label = PERIODS.find(([p]) => p === period)?.[1] ?? period;
  const hasAlts = !!L && (L.altSpreads.length > 0 || L.altTotals.length > 0 ||
    L.teamTotals.away.length > 0 || L.teamTotals.home.length > 0);
  return (
    <>
      {([0, 1] as const).map((i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_330px] items-center gap-2 sm:gap-4">
          <TeamCell sport={g.sport} abbr={i === 0 ? g.away : g.home} />
          <div className="grid grid-cols-3 gap-2">
            {cell(L?.spread, i)}
            {cell(L?.total, i)}
            {cell(L?.ml, i)}
          </div>
        </div>
      ))}
      {!L ? (
        <p className="text-[11px] text-[var(--color-text-muted)]">
          {g.thin ? `${label} lines open closer to game time.` : `No ${label.toLowerCase()} lines posted for this game yet.`}
        </p>
      ) : g.thin ? (
        <p className="text-[11px] text-[var(--color-text-muted)]">
          Main lines only so far. Alts, periods and props open closer to game time.
        </p>
      ) : hasAlts ? (
        <div className="flex items-center gap-1 flex-wrap -ml-2.5">
          {L.altSpreads.length > 0 && (
            <MoreLink on={more === "altSpreads"} onClick={() => toggle("altSpreads")}>Alt spreads</MoreLink>
          )}
          {L.altTotals.length > 0 && (
            <MoreLink on={more === "altTotals"} onClick={() => toggle("altTotals")}>Alt totals</MoreLink>
          )}
          {(L.teamTotals.away.length > 0 || L.teamTotals.home.length > 0) && (
            <MoreLink on={more === "teamTotals"} onClick={() => toggle("teamTotals")}>Team totals</MoreLink>
          )}
        </div>
      ) : null}
      {L && more === "altSpreads" && altGrid(L.altSpreads, L.spread?.[0].leg.line ?? null)}
      {L && more === "altTotals" && altGrid(L.altTotals, L.total?.[0].leg.line ?? null)}
      {L && more === "teamTotals" && (
        <div className="grid grid-cols-2 gap-3">
          {(["away", "home"] as const).map((t) => (
            <div key={t} className="flex flex-col gap-1.5">
              <span className={EYEBROW}>{teamName(g.sport, t === "away" ? g.away : g.home)}</span>
              <div className="grid grid-cols-2 gap-2">{L.teamTotals[t].map(btn)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
