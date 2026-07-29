"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { TeamLogo } from "./TeamLogo";
import { NAV_H, railLifecycle, type RailGame } from "@/lib/rail";

function statusLabel(g: RailGame): string {
  const life = railLifecycle(g.game_state);
  if (life === "live") {
    return g.inning_half && g.inning != null
      ? `${g.inning_half.toUpperCase()} ${g.inning}`
      : "LIVE";
  }
  if (life === "final") return "FINAL";
  return g.sharp_count > 0 ? String(g.sharp_count) : "quiet";
}

export function SlateRail({ games }: { games: RailGame[] }) {
  const [activeId, setActiveId] = useState<number | null>(
    games[0]?.game_id ?? null,
  );
  const idsKey = games.map((g) => g.game_id).join(",");
  const firstQuietId = games.find((g) => g.sharp_count === 0)?.game_id ?? null;

  // Scroll-spy: one observer over the real rendered sections. rootMargin
  // carves out the 64px nav plus the card's own sticky strip so a game
  // highlights when it becomes readable, not when its top slips under the bars.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const stripH =
      document.querySelector("[data-card-strip]")?.getBoundingClientRect()
        .height ?? 96;
    // Below xl a horizontal rail strip pins under the nav; at xl it is
    // display:none, so its measured height is 0 and this term drops out.
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
      {/* DESKTOP (>= xl): fixed vertical rail in the left gutter. Eats 0 column width. */}
      <aside
        aria-label="Jump to game"
        className="hidden xl:block fixed top-[80px] z-20 w-[168px]"
        style={{ left: "calc(50% - 460px - 12px - 168px)" }}
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold px-2 pb-2">
          On the board
        </div>
        <nav className="flex flex-col gap-0.5 max-h-[calc(100vh-96px)] overflow-y-auto scrollbar-subtle pr-1">
          {games.map((g) => {
            const on = g.game_id === activeId;
            const quiet = g.sharp_count === 0;
            const live = railLifecycle(g.game_state) === "live";
            return (
              <div key={g.game_id}>
                {g.game_id === firstQuietId && (
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold px-2 pt-3 pb-1">
                    Quiet
                  </div>
                )}
                <a
                  href={`#game-${g.game_id}`}
                  onClick={jump(g.game_id)}
                  aria-current={on ? "true" : undefined}
                  className={`relative flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[12px] transition-colors ${
                    quiet ? "opacity-60" : ""
                  } ${
                    on
                      ? "bg-[rgba(255,255,255,0.05)] text-[var(--color-text)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-soft)]"
                  }`}
                >
                  {on && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-[#f7f3e9]"
                    />
                  )}
                  <TeamLogo abbr={g.away_team} size={18} flat />
                  <span className="font-bold tabular-nums">{g.away_team}</span>
                  <span className="opacity-40">@</span>
                  <TeamLogo abbr={g.home_team} size={18} flat />
                  <span className="font-bold tabular-nums">{g.home_team}</span>
                  <span
                    className={`ml-auto flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] tabular-nums whitespace-nowrap ${
                      live ? "text-[var(--color-pos)]" : ""
                    }`}
                  >
                    {live && (
                      <span
                        aria-hidden
                        className="w-1.5 h-1.5 rounded-full bg-[var(--color-pos)] animate-pulse"
                      />
                    )}
                    {statusLabel(g)}
                  </span>
                </a>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* NARROW (< xl): horizontal logo strip pinned under the nav. Sibling of
          main, own sticky context, eats 0 horizontal column width. */}
      <div
        data-rail-horizontal
        className="xl:hidden sticky top-16 z-20 bg-[#0a0a0c] border-b border-[rgba(255,255,255,0.06)]"
      >
        <nav
          aria-label="Jump to game"
          className="flex gap-1.5 overflow-x-auto no-scrollbar px-3 py-2"
        >
          {games.map((g) => {
            const on = g.game_id === activeId;
            const quiet = g.sharp_count === 0;
            const live = railLifecycle(g.game_state) === "live";
            return (
              <a
                key={g.game_id}
                href={`#game-${g.game_id}`}
                onClick={jump(g.game_id)}
                aria-current={on ? "true" : undefined}
                aria-label={`Jump to ${g.away_team ?? "away"} at ${g.home_team ?? "home"}`}
                className={`relative flex items-center gap-0.5 shrink-0 px-1.5 py-1 rounded-md ${
                  quiet ? "opacity-60" : ""
                } ${
                  on
                    ? "bg-[rgba(255,255,255,0.05)] ring-1 ring-inset ring-[rgba(255,255,255,0.14)]"
                    : ""
                }`}
              >
                <TeamLogo abbr={g.away_team} size={20} flat />
                <TeamLogo abbr={g.home_team} size={20} flat />
                {live && (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--color-pos)] animate-pulse"
                  />
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </>
  );
}
