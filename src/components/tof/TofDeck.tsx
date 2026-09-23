"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { TofCard, TofChoice } from "@/lib/types";
import { TofCardFace } from "@/components/tof/TofCardFace";

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

/** One entry per card in the hand, in deal order, with what the user did on it. */
export interface DeckProgressItem {
  id: number;
  handle: string;
  tail_label: string;
  tail_odds: number;
  fade_label: string | null;
  fade_odds: number | null;
  choice: TofChoice | null;
}

const CHOICE_COLOR: Record<TofChoice, string> = { tail: "#19f57c", fade: "#ef4444", pass: "#71717a" };

function ProgressDots({ items, currentId, done }: { items: DeckProgressItem[]; currentId: number | null; done: boolean }) {
  const idx = items.findIndex((it) => it.id === currentId);
  const played = items.filter((it) => it.choice).length;
  return (
    <div className="flex w-[360px] max-w-full items-center justify-between" aria-label={`${played} of ${items.length} cards played`}>
      <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {done ? `${played} of ${items.length} played` : idx >= 0 ? `Card ${idx + 1} of ${items.length}` : `${items.length} cards`}
      </div>
      <div className="flex items-center gap-1.5">
        {items.map((it, k) => {
          const current = !done && k === idx;
          const color = it.choice ? CHOICE_COLOR[it.choice] : current ? "#f7f3e9" : "rgba(255,255,255,0.14)";
          return <span key={it.id} className="h-2 rounded-full transition-all duration-200" style={{ width: current ? 20 : 8, background: color }} />;
        })}
      </div>
    </div>
  );
}

function HandSummary({ items }: { items: DeckProgressItem[] }) {
  const count = (c: TofChoice) => items.filter((it) => it.choice === c).length;
  return (
    <div className="absolute inset-0 flex flex-col gap-3 overflow-hidden rounded-xl border border-[rgba(25,245,124,0.3)] bg-[linear-gradient(180deg,rgba(25,245,124,0.10)_0%,#101015_45%,#0b0b0e_100%)] p-5">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-pos)]">Hand complete</div>
      <div className="text-[26px] font-extrabold leading-none tracking-[-0.03em]">You played every card.</div>
      <div className="grid grid-cols-3 gap-2">
        {(["tail", "fade", "pass"] as TofChoice[]).map((c) => (
          <div key={c} className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] px-3 py-2.5">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">{c}</div>
            <div className="mt-1 text-[24px] font-extrabold leading-none" style={{ color: CHOICE_COLOR[c] }}>{count(c)}</div>
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto">
        {items.map((it) => {
          const c = it.choice;
          const color = c ? CHOICE_COLOR[c] : "#52525b";
          const label = c === "fade" ? it.fade_label ?? it.tail_label : it.tail_label;
          const odds = c === "fade" ? it.fade_odds : it.tail_odds;
          return (
            <div key={it.id} className="flex items-center gap-2.5 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-2.5 py-2">
              <span className="w-[52px] rounded-md py-1 text-center text-[9px] font-extrabold tracking-[0.1em]" style={{ background: `${color}1f`, color }}>{(c ?? "locked").toUpperCase()}</span>
              <span className="min-w-0 flex-grow truncate text-[12px] font-bold">@{it.handle} · {label}</span>
              <span className="text-[12px] font-bold tabular-nums text-[var(--color-text-muted)]">{odds == null ? "" : odds > 0 ? `+${odds}` : odds}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-auto text-center text-[11px] text-[var(--color-text-muted)]">Results land after the games finish.</div>
    </div>
  );
}

export function TofDeck({
  open, locked, onPlay, disabled = false, progress,
}: {
  open: DeckCard[];
  locked: DeckCard[];
  onPlay: (card: DeckCard, choice: TofChoice) => Promise<boolean>;
  disabled?: boolean;
  progress?: DeckProgressItem[];
}) {
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leave, setLeave] = useState<Leave>(null);
  const startX = useRef(0);
  const startY = useRef(0);
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
    setDy(0);
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
        setDy(0);
        return;
      }
      setLeave(dir);
      setDragging(false);
      const ok = await onPlay(top, choice);
      if (!ok) {
        setLeave(null);
        setDx(0);
        setDy(0);
        return;
      }
      const wait = prefersReducedMotion() ? 0 : 380;
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => {
        resetTimer.current = null;
        setLeave(null);
        setDx(0);
        setDy(0);
      }, wait);
    },
    [top, onPlay, disabled, leave],
  );

  function onDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (leave || disabled) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* jsdom */ }
    startX.current = e.clientX;
    startY.current = e.clientY;
    setDragging(true);
    setDx(0);
    setDy(0);
  }
  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDx(e.clientX - startX.current);
    setDy(e.clientY - startY.current);
  }
  function onUp() {
    if (!dragging) return;
    // Up wins only when the drag is clearly vertical, so a diagonal fling
    // toward a side still reads as tail or fade.
    if (dy < -DRAG_THRESHOLD && -dy > Math.abs(dx)) void commit("up");
    else if (dx > DRAG_THRESHOLD) void commit("right");
    else if (dx < -DRAG_THRESHOLD) void commit("left");
    else { setDragging(false); setDx(0); setDy(0); }
  }
  function onKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") { e.preventDefault(); void commit("right"); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); void commit("left"); }
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); void commit("up"); }
  }

  const reduced = prefersReducedMotion();
  const topTransform =
    leave === "right" ? "translateX(760px) rotate(30deg)"
      : leave === "left" ? "translateX(-760px) rotate(-30deg)"
        : leave === "up" ? "translateY(-900px)"
          : `translate(${dx}px, ${Math.min(0, dy)}px) rotate(${dx / 18}deg)`;
  const topTransition = reduced ? "none" : leave ? "transform .38s ease-in" : dragging ? "none" : "transform .25s ease-out";
  const stampTail = leave === "right" ? 1 : Math.max(0, Math.min(1, dx / STAMP_FULL));
  const stampFade = leave === "left" ? 1 : Math.max(0, Math.min(1, -dx / STAMP_FULL));
  // The pass stamp only reads on a clearly vertical drag, same rule as the release.
  const stampPass = leave === "up" ? 1 : (-dy > Math.abs(dx) ? Math.max(0, Math.min(1, -dy / STAMP_FULL)) : 0);
  const stack = open.slice(0, 3);

  const allDone = stack.length === 0 && locked.length === 0;
  return (
    <div className="flex flex-col items-center gap-3">
      {progress && progress.length > 0 && <ProgressDots items={progress} currentId={top?.id ?? null} done={allDone} />}
      <div
        data-testid="tof-deck"
        tabIndex={0}
        onKeyDown={onKey}
        className="relative h-[470px] w-[360px] max-w-full outline-none"
        role="group"
        aria-label="Tail or Fade deck"
        aria-describedby={hintId}
      >
        {allDone && progress && progress.length > 0 && <HandSummary items={progress} />}
        {allDone && !(progress && progress.length > 0) && (
          // Every card played and none left locked, with no per-card record to
          // summarize: the deck still says so in the card's own recipe.
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
            : { transform: `translateY(${12 * k}px) scale(${1 - 0.035 * k})`, transition: reduced ? "none" : "transform .3s ease-out", zIndex: 10 - k, opacity: k === 2 ? 0.55 : 1 };
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
                <TofCardFace card={card} stampTail={stampTail} stampFade={stampFade} stampPass={stampPass} />
              ) : (
                // The next cards render their real faces so the one underneath
                // shows through as the top card swipes away. They are inert:
                // no pointer events, hidden from assistive tech.
                <div aria-hidden="true" inert className="pointer-events-none h-full">
                  <TofCardFace card={card} />
                </div>
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
        <div className="mt-4 flex items-center gap-6">
          <button
            type="button"
            aria-label="Fade"
            disabled={disabled || top.kind === "stable"}
            title={top.kind === "stable" ? "Fading your own tail is not a thing." : undefined}
            onClick={() => void commit("left")}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--color-neg)] text-white shadow-[0_8px_20px_rgba(239,68,68,0.28),0_2px_6px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <button
            type="button"
            aria-label="Pass"
            disabled={disabled}
            onClick={() => void commit("up")}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[rgba(255,255,255,0.16)] bg-[#15151a] text-[#a1a1aa] shadow-[0_2px_6px_rgba(0,0,0,0.45)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-30"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
          </button>
          <button
            type="button"
            aria-label="Tail"
            disabled={disabled}
            onClick={() => void commit("right")}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--color-pos)] text-[#06120b] shadow-[0_8px_20px_rgba(25,245,124,0.28),0_2px_6px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6" /></svg>
          </button>
        </div>
      )}
      <div id={hintId} className="text-[11px] font-semibold text-[#52525b]">
        {top ? "Drag the card, use the arrow keys, or tap a button." : locked.length > 0 ? "Every card is locked. Results land by 6 AM." : ""}
      </div>
    </div>
  );
}
