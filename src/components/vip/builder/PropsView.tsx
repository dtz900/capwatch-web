"use client";

import { useState } from "react";
import type { BoardSide } from "@/lib/vip/types";
import { PROP_GROUPS, type BuilderGame, type PropMarket } from "./adapt";
import { Pill, PriceButton, type TapFn } from "./ui";

export const norm = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

/** Every word of the query starts a word of the name ("jalen b" is Brunson,
 *  not Brown). */
export const nameMatches = (name: string, query: string) => {
  const q = norm(query);
  return q !== "" && q.split(" ").every((w) => norm(name).split(" ").some((tok) => tok.startsWith(w)));
};

function PropRow({
  m,
  g,
  selected,
  onTap,
  showPlayer,
}: {
  m: PropMarket;
  g: BuilderGame;
  selected: Set<string>;
  onTap: TapFn;
  showPlayer: boolean;
}) {
  const [altsOpen, setAltsOpen] = useState(false);
  const btn = (sd: BoardSide) => (
    <PriceButton key={sd.key} side={sd} selected={selected.has(sd.key)} onTap={() => onTap(sd, g.id)} />
  );
  // Yes-only markets show their first rung; any others sit behind the toggle.
  const extra = m.sides ? m.alts : m.alts.slice(1);
  return (
    <div className="flex flex-col gap-2 py-2 border-t border-[var(--color-border)] first:border-t-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="sm:flex-1 min-w-0">
          {showPlayer ? (
            <>
              <div className="text-[13px] font-bold text-[var(--color-text)]">{m.player}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">
                {m.stat} · {m.team}
              </div>
            </>
          ) : (
            <div className="text-[12px] font-semibold text-[var(--color-text-soft)]">{m.stat}</div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:w-[300px]">
          {m.sides ? (
            <>
              {btn(m.sides[0])}
              {btn(m.sides[1])}
            </>
          ) : (
            m.alts[0] && btn(m.alts[0])
          )}
          {extra.length > 0 && (
            <button
              type="button"
              onClick={() => setAltsOpen(!altsOpen)}
              className={`h-12 rounded-lg border text-[11px] font-bold transition ${
                altsOpen
                  ? "border-[var(--color-border-h)] text-[var(--color-text)]"
                  : "border-[var(--color-border)] text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
              }`}
            >
              {altsOpen ? "Hide alts" : "Alt lines"}
            </button>
          )}
        </div>
      </div>
      {altsOpen && <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">{extra.map(btn)}</div>}
    </div>
  );
}

export function PropsView({
  g,
  selected,
  onTap,
  initialQuery = "",
}: {
  g: BuilderGame;
  selected: Set<string>;
  onTap: TapFn;
  initialQuery?: string;
}) {
  const tabs = (PROP_GROUPS[g.sport] ?? []).filter((t) => g.props.some((m) => m.group === t));
  const [tab, setTab] = useState(tabs[0] ?? "");
  const [q, setQ] = useState(initialQuery);
  const searching = norm(q) !== "";
  const markets = searching ? g.props.filter((m) => nameMatches(m.player, q)) : g.props.filter((m) => m.group === tab);
  // While searching: every market for each matching player, grouped by player.
  const players = [...new Set(markets.map((m) => m.player))];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          aria-label="Find a player"
          placeholder="Find a player"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-8 w-full sm:w-52 px-3 text-[12px] rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text)] focus:outline-none focus:border-[rgba(255,255,255,0.20)]"
        />
        {!searching && (
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:ml-auto">
            {tabs.map((t) => (
              <Pill key={t} on={t === tab} onClick={() => setTab(t)}>
                {t}
              </Pill>
            ))}
          </div>
        )}
      </div>
      {searching
        ? players.map((pl) => (
            <div key={pl} className="flex flex-col pt-2">
              <div className="text-[13px] font-extrabold text-[var(--color-text)]">
                {pl}
                <span className="ml-2 text-[11px] font-semibold text-[var(--color-text-muted)]">
                  {markets.find((m) => m.player === pl)?.team} · {markets.filter((m) => m.player === pl).length} markets
                </span>
              </div>
              {markets
                .filter((m) => m.player === pl)
                .map((m) => (
                  <PropRow key={`${m.player}-${m.stat}`} m={m} g={g} selected={selected} onTap={onTap} showPlayer={false} />
                ))}
            </div>
          ))
        : markets.map((m) => (
            <PropRow key={`${m.player}-${m.stat}`} m={m} g={g} selected={selected} onTap={onTap} showPlayer />
          ))}
      {markets.length === 0 && (
        <p className="text-[12px] text-[var(--color-text-muted)]">{searching ? "No players match." : "Nothing posted here yet."}</p>
      )}
    </div>
  );
}
