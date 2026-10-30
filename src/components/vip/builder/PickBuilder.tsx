"use client";

/* The seller's VIP pick builder: board, slip, review, post, and the 10 minute
 * fix-or-pull window. Markup ported from the approved mock
 * (src/app/dev/vip-fixtures/PickBuilderMock.tsx). */

import { useEffect, useMemo, useRef, useState } from "react";
import { VipCrown } from "@/components/vip/VipCrown";
import { ERROR_TEXT, EYEBROW, VIP_PRIMARY_BTN, VIP_WORDMARK } from "@/components/vip/styles";
import { fixVipPick, postVipPick, pullVipPick } from "@/lib/vip/client";
import type { BoardSide, BoardSport, VipClamp, VipSport } from "@/lib/vip/types";
import { bookCount, type Period } from "./adapt";
import { Board } from "./Board";
import { BOOKS, OTHER_BOOK, defaultBook } from "./books";
import { builderError, isFixClosed, isGameStarted } from "./errors";
import { ManualEntry } from "./ManualEntry";
import { fmtPrice, type Fmt } from "./odds";
import { Slip, slipTotals } from "./SlipCard";
import { MAX_LEGS, combinedPrice, isSgp, rebook, reformat, toPickBody, toggleLeg, typed, unlockAt, type SlipLeg } from "./slip";
import { PostedView, TicketView, summary, type Posted, type Ticket } from "./TicketView";
import { BookCtx, FmtCtx, GlassCard, PeriodCtx, Segmented } from "./ui";
import { useBoards } from "./useBoards";

const BOARD_SPORTS: BoardSport[] = ["NBA", "NFL"];
const FIX_WINDOW_MS = 10 * 60 * 1000;

type Stage = "build" | "review" | "posted";

/** null until mounted (SSR has no window), then whether the lg column layout
 *  applies. Below lg the slip lives in a right-edge drawer. */
function useIsLg(): boolean | null {
  const [isLg, setIsLg] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isLg;
}

/** The ticket as recorded: each clamped leg (leg_index null on a straight)
 *  and a clamped ticket price take the server's recorded price. */
function applyClamps(t: Ticket, clamped: VipClamp[], fmt: Fmt): Ticket {
  if (clamped.length === 0) return t;
  const parlay = t.legs.length > 1;
  const legs = t.legs.map((l, i) => {
    const c = clamped.find((x) => (parlay ? x.leg_index === i : x.leg_index === null));
    return c ? { ...l, american: c.recorded, edited: false, price: fmtPrice(c.recorded, fmt) } : l;
  });
  const ticketClamp = parlay ? clamped.find((x) => x.leg_index === null) : clamped[0];
  let combined = t.combined;
  if (ticketClamp) combined = ticketClamp.recorded;
  else if (parlay && clamped.length > 0) combined = combinedPrice(legs) ?? combined;
  return { ...t, legs, combined };
}

const startOf = (l: SlipLeg) => (l.game.commence_time ? Date.parse(l.game.commence_time) : Infinity);

/** Legs left after the server said a game started: those past their start
 *  by our clock, else (clock skew) the earliest game's legs. */
export function dropStarted(legs: SlipLeg[], now: number): SlipLeg[] {
  const kept = legs.filter((l) => startOf(l) > now);
  if (kept.length < legs.length) return kept;
  const first = Math.min(...legs.map(startOf));
  return legs.filter((l) => startOf(l) !== first);
}

export function PickBuilder({
  token,
  eligibleSports,
  preferredBook,
  onPosted,
}: {
  token: string;
  eligibleSports: string[];
  preferredBook?: string | null;
  onPosted?: () => void;
}) {
  const sports = eligibleSports.map((s) => s.toUpperCase() as VipSport);
  const boardSports = BOARD_SPORTS.filter((s) => sports.includes(s));
  const boards = useBoards(boardSports, token);
  const [sport, setSport] = useState<BoardSport | null>(boardSports[0] ?? null);
  const [fmt, setFmt] = useState<Fmt>("american");
  const [book, setBook] = useState(() => defaultBook(preferredBook));
  // A main book saved in the stats card while the builder is open takes
  // over the book picker and re-prices legs the capper has not typed over.
  const [savedBook, setSavedBook] = useState(preferredBook);
  const [query, setQuery] = useState("");
  const [legs, setLegs] = useState<SlipLeg[]>([]);
  const [units, setUnits] = useState("1");
  const [stage, setStage] = useState<Stage>("build");
  const [sgpPrice, setSgpPrice] = useState("");
  const [slipOpen, setSlipOpen] = useState(false);
  const [day, setDay] = useState("");
  const [period, setPeriod] = useState<Period>("Game");
  const [posted, setPosted] = useState<Posted | null>(null);
  const [fixing, setFixing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLg = useIsLg();

  // An emptied slip falls back inline, so the drawer starts closed next time.
  const updateLegs = (next: SlipLeg[]) => {
    setLegs(next);
    if (next.length === 0) setSlipOpen(false);
  };

  if (preferredBook !== savedBook) {
    setSavedBook(preferredBook);
    const next = defaultBook(preferredBook);
    setBook(next);
    setLegs(rebook(legs, next, fmt));
  }

  const games = useMemo(() => (sport ? boards.games[sport] ?? [] : []), [boards.games, sport]);
  const days = [...new Set(games.map((g) => g.day))];
  const shownDay = days.includes(day) ? day : days[0] ?? "";
  const { prioritize } = boards;
  const dayIds = games.filter((g) => g.day === shownDay).map((g) => g.id).join(",");
  useEffect(() => {
    if (dayIds) prioritize(dayIds.split(","));
  }, [dayIds, prioritize]);

  const allGames = useMemo(() => Object.values(boards.games).flat(), [boards.games]);
  const selected = new Set(legs.map((l) => l.side.key));
  const totals = slipTotals(legs, units, sgpPrice);

  const tap = (side: BoardSide, gameId: string) => {
    const g = allGames.find((x) => x.id === gameId && x.sport === side.leg.sport);
    if (!g) return;
    setStage("build");
    updateLegs(toggleLeg(legs, side, g.slate, book, fmt));
  };

  /** False (and nothing added) when the batch would pass the leg limit, so
   *  the editor keeps the drafts instead of dropping some silently. */
  const addLegs = (more: SlipLeg[]): boolean => {
    if (legs.length + more.length > MAX_LEGS) {
      setError(`A ticket holds up to ${MAX_LEGS} legs. Remove some first.`);
      return false;
    }
    setError(null);
    setStage("build");
    setLegs([...legs, ...more]);
    return true;
  };

  const switchBook = (next: string) => {
    setBook(next);
    setLegs(rebook(legs, next, fmt));
  };

  const switchFmt = (next: Fmt) => {
    setFmt(next);
    setLegs(reformat(legs, next));
    // The same game parlay price stays as typed: rewriting it in the other
    // format would round it (1.63 reads back as -159, not -160).
  };

  const switchSport = (next: BoardSport) => {
    setSport(next);
    setQuery("");
    setDay("");
    setStage("build");
  };

  // Posting hides the board, so the page shrinks under the reader; fixing or
  // posting another brings it back. Each time, land on the builder's top.
  const sectionRef = useRef<HTMLElement>(null);
  const toBuilderTop = () =>
    requestAnimationFrame(() => {
      const el = sectionRef.current;
      if (!el) return;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: "smooth" });
    });

  /** Leave a fix without saving: the posted ticket stands as it was. */
  const cancelFix = () => {
    setFixing(false);
    setStage("posted");
    toBuilderTop();
  };

  const post = async () => {
    setBusy(true);
    setError(null);
    const body = toPickBody(legs, units, sgpPrice);
    try {
      const res = fixing && posted ? await fixVipPick(posted.ticketId, body, token) : await postVipPick(body, token);
      // Show what the record holds: a clamped leg or ticket at the
      // recorded price, not the one typed.
      const ticket = applyClamps({ legs, units, combined: totals.combined, book }, res.clamped ?? [], fmt);
      const deadline = res.fix_deadline ? Date.parse(res.fix_deadline) : Date.now() + FIX_WINDOW_MS;
      setPosted({
        ...ticket,
        ticketId: res.ticket_id ?? res.created_pick_ids[0],
        original: fixing && posted
          ? posted.original ?? { legs: posted.legs, units: posted.units, combined: posted.combined, book: posted.book }
          : null,
        pulled: false,
        fixDeadline: fixing && posted ? posted.fixDeadline : deadline,
        clamped: res.clamped ?? [],
      });
      setFixing(false);
      setStage("posted");
      toBuilderTop();
      onPosted?.();
    } catch (err) {
      setError(builderError(err));
      if (fixing && posted && (isFixClosed(err) || isGameStarted(err))) {
        // The fix can never land now; back to the posted ticket, where
        // Pull still works while the game has not started.
        cancelFix();
      } else if (isGameStarted(err)) {
        updateLegs(dropStarted(legs, Date.now()));
        setStage("build");
      }
    } finally {
      setBusy(false);
    }
  };

  const pull = async () => {
    if (!posted) return;
    setBusy(true);
    setError(null);
    try {
      await pullVipPick(posted.ticketId, token);
      setPosted({ ...posted, pulled: true });
      onPosted?.();
    } catch (err) {
      setError(builderError(err));
    } finally {
      setBusy(false);
    }
  };

  const startFix = () => {
    if (!posted) return;
    setLegs(posted.legs);
    setUnits(posted.units);
    // A same game parlay carries its book price on the ticket, not the legs.
    // American text reads back exactly; decimal would round (1.63 -> -159).
    setSgpPrice(isSgp(posted.legs) && posted.combined !== null ? fmtPrice(posted.combined, "american") : "");
    setError(null);
    setFixing(true);
    setStage("build");
    toBuilderTop();
  };

  const postAnother = () => {
    setPosted(null);
    updateLegs([]);
    setUnits("1");
    setSgpPrice("");
    setFixing(false);
    setError(null);
    setStage("build");
    toBuilderTop();
  };

  const review = () => {
    setError(null);
    setStage("review");
    setSlipOpen(false);
    // Below lg the preview renders under the board; bring it up.
    requestAnimationFrame(() =>
      document.getElementById("vip-builder-review")?.scrollIntoView({ block: "start", behavior: "smooth" }),
    );
  };

  return (
    <FmtCtx.Provider value={fmt}>
      <BookCtx.Provider value={book}>
        <PeriodCtx.Provider value={period}>
          <section ref={sectionRef} className="relative overflow-hidden sm:rounded-xl sm:border sm:border-[rgba(255,255,255,0.07)] sm:bg-[#111116] py-1 sm:px-6 sm:py-6 flex flex-col gap-5">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 hidden sm:block bg-[radial-gradient(60%_100%_at_15%_0%,rgba(109,40,217,0.16),transparent_70%)]" />
            <header className="relative flex items-end justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <VipCrown className="w-[18px] h-[18px]" />
                  <span className={VIP_WORDMARK}>VIP</span>
                </div>
                <h3 className="text-[24px] leading-none font-extrabold tracking-[-0.02em] text-[var(--color-text)]">
                  {stage === "posted" ? "Your VIP pick" : fixing ? "Fix your pick" : "New VIP pick"}
                </h3>
                {stage !== "posted" && (
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    Only your subscribers see it until 30 minutes after the game starts. Then everyone can.
                  </p>
                )}
                {fixing && stage !== "posted" && (
                  <button
                    type="button"
                    onClick={cancelFix}
                    className="self-start text-[11px] font-semibold text-[var(--color-text-soft)] hover:text-[var(--color-text)] underline underline-offset-2"
                  >
                    Keep the posted pick
                  </button>
                )}
              </div>
              <div className={`flex items-end gap-3 flex-wrap ${stage === "posted" ? "hidden" : ""}`}>
                <label className="flex flex-col gap-1">
                  <span className={EYEBROW}>Book</span>
                  <select
                    aria-label="Your book"
                    value={book}
                    onChange={(e) => switchBook(e.target.value)}
                    className="h-9 pl-3 pr-8 text-[12px] font-bold rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text)] focus:outline-none focus:border-[rgba(255,255,255,0.22)]"
                  >
                    {BOOKS.map((b) => (
                      <option key={b.id} value={b.id} className="bg-[#0e0e12]">
                        {b.name}
                      </option>
                    ))}
                    <option value={OTHER_BOOK} className="bg-[#0e0e12]">
                      Other book
                    </option>
                  </select>
                </label>
                <div className="flex flex-col gap-1">
                  <span className={EYEBROW}>Odds</span>
                  <Segmented<Fmt> value={fmt} onChange={switchFmt} options={[["american", "-110"], ["decimal", "1.91"]]} />
                </div>
              </div>
            </header>

            {stage !== "posted" && (
              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                <div className="flex flex-col gap-4 min-w-0">
                  {sport && (
                    <Board
                      sports={boardSports}
                      sport={sport}
                      onSport={switchSport}
                      games={games}
                      day={shownDay}
                      onDay={setDay}
                      query={query}
                      onQuery={setQuery}
                      period={period}
                      onPeriod={setPeriod}
                      selected={selected}
                      onTap={tap}
                      legCount={(s) => legs.filter((l) => l.game.sport === s).length}
                      books={bookCount(allGames)}
                      status={boards.status[sport] ?? "loading"}
                    />
                  )}
                  <ManualEntry sports={sports} token={token} onAdd={addLegs} startOpen={!sport} />
                </div>
                <div className="contents lg:flex lg:flex-col lg:gap-4 lg:sticky lg:top-[136px] lg:max-h-[calc(100vh-152px)] lg:overflow-y-auto">
                  {stage === "build" && (
                    <Slip
                      legs={legs}
                      totals={totals}
                      units={units}
                      onUnits={setUnits}
                      sgpPrice={sgpPrice}
                      onSgpPrice={setSgpPrice}
                      onPrice={(i, v) => setLegs(legs.map((x, j) => (j === i ? typed(x, v) : x)))}
                      onRemove={(i) => updateLegs(legs.filter((_, j) => j !== i))}
                      onClear={() => updateLegs([])}
                      onReview={review}
                      fixing={fixing}
                      isLg={isLg}
                      open={slipOpen}
                      onOpen={setSlipOpen}
                    />
                  )}
                  {stage === "build" && error && (
                    <span role="status" className={ERROR_TEXT}>
                      {error}
                    </span>
                  )}
                  {stage === "review" && (
                    <div id="vip-builder-review" className="scroll-mt-[150px]">
                      <GlassCard>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <VipCrown className="w-4 h-4" />
                            <span className={VIP_WORDMARK}>{fixing ? "PREVIEW FIX" : "PREVIEW"}</span>
                          </div>
                          <p className="text-[13px] font-semibold text-[var(--color-text)]">
                            {fixing ? "Your subscribers get this change, next to the original." : "This is exactly what your subscribers get."}
                          </p>
                          {fixing && posted && (
                            <div className="rounded-lg bg-[rgba(0,0,0,0.25)] px-3 py-2 text-[12px] text-[rgba(247,243,233,0.55)]">
                              Replaces: <span className="line-through">{summary(posted.original ?? posted, fmt)}</span>
                            </div>
                          )}
                          <TicketView ticket={{ legs, units, combined: totals.combined, book }} fmt={fmt} />
                          <div className="flex items-center gap-2 rounded-lg bg-[rgba(0,0,0,0.25)] px-3 py-2.5">
                            <svg aria-hidden="true" viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0 text-[var(--color-vip-text)]">
                              <path fill="currentColor" d="M5 7V5a3 3 0 1 1 6 0v2h.5A1.5 1.5 0 0 1 13 8.5v5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 13.5v-5A1.5 1.5 0 0 1 4.5 7H5Zm1.5 0h3V5a1.5 1.5 0 0 0-3 0v2Z" />
                            </svg>
                            <span className="text-[12px] text-[rgba(247,243,233,0.8)]">
                              Only your subscribers see this until <span className="font-bold text-[var(--color-text)]">{unlockAt(legs)}</span>. Then everyone can.
                            </span>
                          </div>
                          <button type="button" className={`${VIP_PRIMARY_BTN} w-full h-11`} disabled={busy} onClick={post}>
                            {fixing ? "Save fix" : "Post to subscribers"}
                          </button>
                          {error && (
                            <span role="status" className={ERROR_TEXT}>
                              {error}
                            </span>
                          )}
                          <button
                            type="button"
                            className="self-center text-[12px] font-semibold text-[rgba(247,243,233,0.6)] hover:text-[var(--color-text)]"
                            onClick={() => setStage("build")}
                          >
                            Back to edit
                          </button>
                        </div>
                      </GlassCard>
                    </div>
                  )}
                </div>
              </div>
            )}

            {stage === "posted" && posted && (
              <PostedView posted={posted} fmt={fmt} onFix={startFix} onPull={pull} onAnother={postAnother} error={error} busy={busy} />
            )}
          </section>
        </PeriodCtx.Provider>
      </BookCtx.Provider>
    </FmtCtx.Provider>
  );
}
