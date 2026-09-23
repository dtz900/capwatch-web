"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { TofCard, TofChoice } from "@/lib/types";
import { CATEGORY, TofCardFace } from "@/components/tof/TofCardFace";

export interface StableDeckCard {
  kind: "stable";
  id: number;            // -pick_id so it never collides with a shared card id
  pick_id: number;
  handle: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  matchup: string;
  game_start_at: string;
  market_group: "ML" | "Spread" | "Game Total";
  tail_label: string;
  tail_odds: number;
  note: string;
  capper_streak: number;
  capper_record: string | null;
  sport: string;
}

export type DeckCard = (TofCard & { kind: "shared" }) | StableDeckCard;

const DRAG_THRESHOLD = 90;
const STAMP_FULL = 80;
type Leave = "left" | "right" | "up" | null;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function TofDeck({
  open, locked, onPlay, disabled = false,
}: {
  open: DeckCard[];
  locked: DeckCard[];
  onPlay: (card: DeckCard, choice: TofChoice) => Promise<boolean>;
  disabled?: boolean;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leave, setLeave] = useState<Leave>(null);
  const startX = useRef(0);
  const hintId = useId();
  // The fly-off reset is a bare timer, so an unmount mid-animation would fire
  // setState on a gone component. Held here and cleared on unmount.
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);
  const top = open[0] ?? null;

  // A new top card means the previous one left; reset any stale transform.
  // Adjusted during render (React's documented alternative to an effect for
  // "state that depends on a prop") so it never triggers a second render.
  const [prevTopId, setPrevTopId] = useState<number | null>(top?.id ?? null);
  if ((top?.id ?? null) !== prevTopId) {
    setPrevTopId(top?.id ?? null);
    setDx(0);
    setLeave(null);
  }

  // `leave` doubles as the re-entrancy guard: it goes non-null the instant a
  // commit starts and only clears once that commit is fully resolved, so a
  // second commit on the same card can't start underneath it.
  const commit = useCallback(
    async (dir: Exclude<Leave, null>) => {
      if (!top || leave || disabled) return;
      const choice: TofChoice = dir === "right" ? "tail" : dir === "left" ? "fade" : "pass";
      if (choice === "fade" && top.kind === "stable") {
        // A stable card can't be faded. If this came from a drag past the
        // threshold, the card is still visually offset; snap it back instead
        // of leaving it stranded until the next pointer down.
        setDragging(false);
        setDx(0);
        return;
      }
      setLeave(dir);
      setDragging(false);
      const ok = await onPlay(top, choice);
      if (!ok) {
        setLeave(null);
        setDx(0);
        return;
      }
      const wait = prefersReducedMotion() ? 0 : 380;
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => {
        resetTimer.current = null;
        setLeave(null);
        setDx(0);
      }, wait);
    },
    [top, onPlay, disabled, leave],
  );

  function onDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (leave || disabled) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* jsdom */ }
    startX.current = e.clientX;
    setDragging(true);
    setDx(0);
  }
  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDx(e.clientX - startX.current);
  }
  function onUp() {
    if (!dragging) return;
    if (dx > DRAG_THRESHOLD) void commit("right");
    else if (dx < -DRAG_THRESHOLD) void commit("left");
    else { setDragging(false); setDx(0); }
  }
  function onKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") { e.preventDefault(); void commit("right"); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); void commit("left"); }
    else if (e.key === "ArrowDown") { e.preventDefault(); void commit("up"); }
  }

  const reduced = prefersReducedMotion();
  const topTransform =
    leave === "right" ? "translateX(760px) rotate(30deg)"
      : leave === "left" ? "translateX(-760px) rotate(-30deg)"
        : leave === "up" ? "translateY(-900px)"
          : `translateX(${dx}px) rotate(${dx / 18}deg)`;
  const topTransition = reduced ? "none" : leave ? "transform .38s ease-in" : dragging ? "none" : "transform .25s ease-out";
  const stampTail = leave === "right" ? 1 : Math.max(0, Math.min(1, dx / STAMP_FULL));
  const stampFade = leave === "left" ? 1 : Math.max(0, Math.min(1, -dx / STAMP_FULL));
  const stack = open.slice(0, 3);

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        data-testid="tof-deck"
        tabIndex={0}
        onKeyDown={onKey}
        className="relative h-[470px] w-[360px] max-w-full outline-none"
        role="group"
        aria-label="Tail or Fade deck"
        aria-describedby={hintId}
      >
        {stack.length === 0 && locked.length === 0 && (
          // Every card played and none left locked: the deck would otherwise
          // be an empty box, so it says so in the card's own recipe.
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-gradient-to-b from-[#17171d] via-[#101015] to-[#0b0b0e] px-6 text-center">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Tail or Fade</div>
            <div className="text-[18px] font-extrabold tracking-[-0.02em]">You played every card.</div>
            <div className="text-[13px] text-[var(--color-text-soft)]">Results land after the games finish.</div>
          </div>
        )}
        {stack.length === 0 && locked.length > 0 && (
          <div className="absolute inset-0">
            <TofCardFace card={locked[0]} locked />
            {locked.length > 1 && (
              <div className="absolute inset-x-0 -bottom-6 text-center text-[11px] font-bold text-[var(--color-text-muted)]">
                {locked.length} cards locked
              </div>
            )}
          </div>
        )}
        {[...stack].reverse().map((card, i) => {
          const k = stack.length - 1 - i; // 0 = top
          const isTop = k === 0;
          const style = isTop
            ? { transform: topTransform, transition: topTransition, zIndex: 10, touchAction: "none" as const, cursor: "grab" }
            : { transform: `translateY(${-16 * k}px) scale(${1 - 0.04 * k})`, transition: reduced ? "none" : "transform .3s ease-out", zIndex: 10 - k, opacity: k === 2 ? 0.8 : 1 };
          return (
            <div
              key={card.id}
              className="absolute inset-0"
              style={style}
              onPointerDown={isTop ? onDown : undefined}
              onPointerMove={isTop ? onMove : undefined}
              onPointerUp={isTop ? onUp : undefined}
              onPointerCancel={isTop ? onUp : undefined}
            >
              {isTop ? (
                <TofCardFace card={card} stampTail={stampTail} stampFade={stampFade} />
              ) : (
                // A card underneath the top of the deck: its colored category
                // tab peeks out above the top card, and nothing else, so it
                // never duplicates the top card's visible text.
                <div
                  aria-hidden="true"
                  className="h-full rounded-xl border border-[var(--color-border)] bg-gradient-to-b from-[#17171d] via-[#101015] to-[#0b0b0e]"
                  style={{ borderTop: `4px solid ${(CATEGORY[card.kind === "stable" ? "stable" : card.category] ?? CATEGORY.wildcard).color}` }}
                />
              )}
            </div>
          );
        })}
        {stack.length > 0 && locked.length > 0 && (
          <div className="absolute inset-x-0 -bottom-6 text-center text-[11px] font-bold text-[var(--color-text-muted)]">
            {locked.length} locked at the back
          </div>
        )}
      </div>

      {top && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            aria-label="Fade"
            disabled={disabled || top.kind === "stable"}
            title={top.kind === "stable" ? "Fading your own tail is not a thing." : undefined}
            onClick={() => void commit("left")}
            className="flex h-14 min-w-[124px] items-center justify-center gap-2 rounded-full bg-[var(--color-neg)] px-6 font-[var(--font-lilita)] text-[22px] tracking-[0.06em] text-[#0a0a0c] shadow-[0_4px_0_#9f1f1f] transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-30 disabled:shadow-none"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            FADE
          </button>
          <button
            type="button"
            aria-label="Pass"
            disabled={disabled}
            onClick={() => void commit("up")}
            className="flex h-11 items-center justify-center rounded-full border-2 border-[rgba(255,255,255,0.18)] bg-white/[0.03] px-5 font-[var(--font-lilita)] text-[16px] tracking-[0.08em] text-[#a1a1aa] transition-transform active:translate-y-[2px] disabled:opacity-30"
          >
            PASS
          </button>
          <button
            type="button"
            aria-label="Tail"
            disabled={disabled}
            onClick={() => void commit("right")}
            className="flex h-14 min-w-[124px] items-center justify-center gap-2 rounded-full bg-[var(--color-pos)] px-6 font-[var(--font-lilita)] text-[22px] tracking-[0.06em] text-[#0a0a0c] shadow-[0_4px_0_#0f9a4c] transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-30 disabled:shadow-none"
          >
            TAIL
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6" /></svg>
          </button>
        </div>
      )}
      <div id={hintId} className="text-[11px] font-semibold text-[#52525b]">
        {top ? "Drag the card, use the arrow keys, or tap a button." : locked.length > 0 ? "Every card is locked. Results land by 6 AM." : ""}
      </div>
    </div>
  );
}
