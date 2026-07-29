"use client";

import { Fragment, useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { TeamLogo } from "./TeamLogo";
import { teamColor } from "@/lib/mlb-teams";
import { NAV_H, railLifecycle, type RailGame } from "@/lib/rail";

function timeET(iso: string | null): string {
  if (!iso) return "";
  try {
    return (
      new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      }) + " ET"
    );
  } catch {
    return "";
  }
}

export function SlateRail({ games }: { games: RailGame[] }) {
  const [activeId, setActiveId] = useState<number | null>(
    games[0]?.game_id ?? null,
  );
  const idsKey = games.map((g) => g.game_id).join(",");

  // Scroll-spy: one observer over the real rendered sections. rootMargin
  // carves out the 64px nav, the below-xl horizontal strip (measured, 0 when
  // it is display:none at xl), and the card's own sticky strip, so a game
  // highlights when it becomes readable, not when its top slips under the bars.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const stripH =
      document.querySelector("[data-card-strip]")?.getBoundingClientRect()
        .height ?? 96;
    const railH =
      document.querySelector("[data-rail-horizontal]")?.getBoundingClientRect()
        .height ?? 0;
    const topInset = NAV_H + Math.round(railH) + Math.round(stripH) + 8;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!vis.length) return; // keep last active, avoid flicker
        const id = Number((vis[0].target as HTMLElement).dataset.slateGame);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() =>
          setActiveId((cur) => (cur === id ? cur : id)),
        );
      },
      { rootMargin: `-${topInset}px 0px -55% 0px`, threshold: 0 },
    );
    document
      .querySelectorAll<HTMLElement>("[data-slate-game]")
      .forEach((el) => io.observe(el));
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
    // idsKey is a stable string of the game set; only rebind when it changes.
  }, [idsKey]);

  function jump(id: number) {
    return (e: MouseEvent) => {
      e.preventDefault();
      setActiveId(id);
      const el = document.getElementById(`game-${id}`);
      if (!el) return;
      const reduce = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", `#game-${id}`);
    };
  }

  if (games.length === 0) return null;

  return (
    <>
      {/* NARROW (< xl): horizontal logo strip pinned under the nav. Full width
          as the first item of the flex-col, so it eats 0 horizontal room from
          the board. */}
      <div
        data-rail-horizontal
        className="xl:hidden w-full sticky top-16 z-20 -mx-4 sm:-mx-7 bg-[#0a0a0c] border-b border-[rgba(255,255,255,0.06)]"
      >
        <nav
          aria-label="Jump to game"
          className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 sm:px-7 py-2"
        >
          {games.map((g, i) => {
            const on = g.game_id === activeId;
            const quiet = g.sharp_count === 0;
            const live = railLifecycle(g.game_state) === "live";
            return (
              <Fragment key={g.game_id}>
                {i > 0 && (
                  <span
                    aria-hidden
                    className="shrink-0 self-stretch w-px my-1 bg-[rgba(255,255,255,0.10)]"
                  />
                )}
                <a
                  href={`#game-${g.game_id}`}
                  onClick={jump(g.game_id)}
                  aria-current={on ? "true" : undefined}
                  aria-label={`Jump to ${g.away_team ?? "away"} versus ${g.home_team ?? "home"}`}
                  className={`relative flex items-center gap-0.5 shrink-0 px-1.5 py-1 rounded-md ${
                    quiet ? "opacity-60" : ""
                  } ${
                    on
                      ? "bg-[rgba(255,255,255,0.05)] ring-1 ring-inset ring-[rgba(255,255,255,0.14)]"
                      : ""
                  }`}
                >
                  <TeamLogo abbr={g.away_team} size={20} flat />
                  <span className="px-0.5 text-[10px] font-bold lowercase text-[var(--color-text-muted)]">
                    v
                  </span>
                  <TeamLogo abbr={g.home_team} size={20} flat />
                  {live && (
                    <span
                      aria-hidden
                      className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--color-pos)] animate-pulse"
                    />
                  )}
                </a>
              </Fragment>
            );
          })}
        </nav>
      </div>

      {/* DESKTOP (>= xl): one full-height rectangle divided into a row per
          matchup. Rows flex to fill the viewport height with no scrollbar, so
          the rail is responsive to the screen size. The active row is marked by
          a ribbon on the left edge, not a full fill. */}
      <aside
        aria-label="Jump to game"
        className="hidden xl:flex flex-col sticky top-16 self-start shrink-0 w-[220px]
                   h-[calc(100dvh-4rem)] py-3"
      >
        <div className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold px-1 pb-2">
          On the board
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden border border-[rgba(255,255,255,0.08)] divide-y divide-[rgba(255,255,255,0.08)]">
          {games.map((g) => {
            const on = g.game_id === activeId;
            const quiet = g.sharp_count === 0;
            const life = railLifecycle(g.game_state);
            const showScore = life === "live" || life === "final";
            const awayColor = teamColor(g.away_team);
            const homeColor = teamColor(g.home_team);
            return (
              <a
                key={g.game_id}
                href={`#game-${g.game_id}`}
                onClick={jump(g.game_id)}
                aria-current={on ? "true" : undefined}
                aria-label={`Jump to ${g.away_team ?? "away"} versus ${g.home_team ?? "home"}`}
                className={`relative flex-1 min-h-0 overflow-hidden flex flex-col justify-center gap-0.5 px-3
                  transition-colors ${quiet ? "opacity-60" : ""} ${
                    on
                      ? "text-[var(--color-text)]"
                      : "text-[var(--color-text-soft)] hover:bg-[rgba(255,255,255,0.03)]"
                  }`}
              >
                {on && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#f7f3e9]"
                  />
                )}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 leading-none">
                  <span className="flex items-center gap-1 min-w-0 text-[11px] font-bold tracking-tight">
                    <TeamLogo abbr={g.away_team} size={14} flat />
                    <span className="truncate">{g.away_team}</span>
                  </span>
                  <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-50">
                    v
                  </span>
                  <span className="flex items-center justify-end gap-1 min-w-0 text-[11px] font-bold tracking-tight">
                    <span className="truncate">{g.home_team}</span>
                    <TeamLogo abbr={g.home_team} size={14} flat />
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 leading-none">
                  <span
                    className="text-left text-[15px] font-extrabold tabular-nums"
                    style={showScore ? { color: awayColor } : undefined}
                  >
                    {showScore ? g.away_score ?? "-" : ""}
                  </span>
                  <span
                    className={`flex items-center gap-1 text-[8px] uppercase tracking-[0.12em] font-bold whitespace-nowrap ${
                      life === "live"
                        ? "text-[var(--color-pos)]"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {life === "live" ? (
                      <>
                        <span
                          aria-hidden
                          className="w-1 h-1 rounded-full bg-[var(--color-pos)] animate-pulse"
                        />
                        {g.inning_half && g.inning != null
                          ? `${g.inning_half.toUpperCase()} ${g.inning}`
                          : "LIVE"}
                      </>
                    ) : life === "final" ? (
                      "FINAL"
                    ) : (
                      timeET(g.game_time)
                    )}
                  </span>
                  <span
                    className="text-right text-[15px] font-extrabold tabular-nums"
                    style={showScore ? { color: homeColor } : undefined}
                  >
                    {showScore ? g.home_score ?? "-" : ""}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </aside>
    </>
  );
}
