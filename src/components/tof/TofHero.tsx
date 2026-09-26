"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUsernameClaim } from "@/components/auth/UsernameClaim";
import { CallbackErrorBanner } from "@/components/auth/CallbackErrorBanner";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { fetchTofBoard, fetchTofHand, fetchTodayPicks } from "@/lib/api";
import { clearGuestChoices, dealOrder, isLocked, orderDeck, readGuestChoices, readHandCache, unitsLabel, writeGuestChoices, writeHandCache } from "@/lib/tof/deck";
import type { TofBoardRow, TofCard, TofChoice, TofHandResponse, TofPlay, TofStats, TodayPickEntry } from "@/lib/types";
import { TofDeck, type DeckCard, type DeckProgressItem, type StableDeckCard } from "@/components/tof/TofDeck";
import { TofBoard } from "@/components/tof/TofBoard";
import { BoardAvatar } from "@/components/tof/BoardAvatar";
import { displayAvatar } from "@/lib/x-claim";
import { logGuestSwipe, markGuestConverted } from "@/lib/tof/guest-log";
import { shouldLandOpen } from "@/lib/tof/first-visit";
import { replayGuestPicks } from "@/lib/tof/replay";

const RETURN_COOKIE = "ts_return_to";

const FELT = "radial-gradient(ellipse 62% 120% at 50% 40%, #12432f 0%, #0c2f22 45%, #071c15 72%, #0a0a0c 100%)";
const REFETCH_MS = 60_000;
const FOLD_MS = 550; // matches .tof-fold in globals.css

/* The stable card is the user's own tail, offered alongside the shared hand.
   It has to clear the same bar a dealt card does: still ungraded, priced at
   the odds the platform will grade it at, and not already under way. */
function stableFromPick(p: TodayPickEntry, now: Date, played = false): StableDeckCard | null {
  if (p.kind !== "straight" || p.pick_id == null) return null;
  // A pick the user already played stays on the card for the summary even
  // once it has started or graded; only an unplayed candidate is screened.
  if (!played && p.outcome != null) return null; // already graded, nothing left to tail
  // grading_odds is the price the platform scores at; odds_taken is the
  // fallback until the feed serves it. Never default to a house price.
  const odds = p.grading_odds ?? p.odds_taken;
  if (odds == null) return null;
  const group = p.market_group === "ML" || p.market_group === "Spread" || p.market_group === "Game Total" ? p.market_group : null;
  if (!group || !p.matchup) return null;
  const card: StableDeckCard = {
    kind: "stable", id: -p.pick_id, pick_id: p.pick_id, handle: p.handle, display_name: p.display_name,
    profile_image_url: p.profile_image_url, matchup: p.matchup, game_start_at: p.commence_time ?? "",
    market_group: group, tail_label: p.selection ?? p.market ?? "", tail_odds: odds,
    note: "From your stable.", capper_streak: 0,
    capper_record: null, sport: "MLB",
  };
  if (!played && p.commence_time && isLocked(card, now)) return null;
  return card;
}

const PT_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" });

/** "Deck drops today at 11:00 AM PT" or "Next deck Sat Sep 26 at 9:00 AM PT".
    The API sends the day-aware drop time; if it is missing (older API) the
    time is derived from the weekday: 11 AM PT weekdays, 9 AM PT weekends. */
/** The user played a stable pick this hand but the pick is no longer
    reachable (they unfollowed the capper since). Keep the play on the
    summary under a generic label so the count and the grade stay right. */
function placeholderStable(pickId: number): StableDeckCard {
  return {
    kind: "stable", id: -pickId, pick_id: pickId, handle: "your stable", display_name: null,
    profile_image_url: null, matchup: "", game_start_at: "", market_group: "ML", tail_label: "Stable pick",
    tail_odds: 0, note: "From your stable.", capper_streak: 0, capper_record: null, sport: "MLB", placeholder: true,
  };
}

function nextDealLabel(next: { date: string; expected_at: string | null } | null, now = new Date()): string {
  if (!next) return "";
  const noon = new Date(`${next.date}T12:00:00Z`); // a safe midday instant for weekday/format only
  const weekend = noon.getUTCDay() === 0 || noon.getUTCDay() === 6;
  const time = next.expected_at
    ? new Date(next.expected_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" })
    : weekend ? "9:00 AM" : "11:00 AM";
  const today = PT_DATE.format(now) === next.date;
  if (today) return `Deck drops today at ${time} PT`;
  const wd = noon.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const md = noon.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `Next deck ${wd} ${md} at ${time} PT`;
}

const NO_HAND_COPY: Record<string, string> = {
  "no hand yet": "Today's deck hasn't dropped yet.",
  "not dealt yet": "Today's deck hasn't dropped yet.",
  "waiting for deal time": "Today's deck hasn't dropped yet.",
  "no games today": "No games today.",
  "no games after the drop": "Only early games today, so nothing to deal.",
  "fewer than 3 cards": "Not enough picks for a hand today.",
};

export function TofHero({ initial }: { initial: TofHandResponse | null }) {
  const router = useRouter();
  const { session, profile, entitlements, capper, authReady } = useAuth();
  const { requireUsername } = useUsernameClaim();
  const userId = session?.user?.id ?? null;
  const supabase = useMemo(
    () => (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? createBrowserSupabase() : null),
    [],
  );

  const [data, setData] = useState<TofHandResponse | null>(initial);
  const [plays, setPlays] = useState<TofPlay[]>([]);
  const [stable, setStable] = useState<StableDeckCard | null>(null);
  const [stats, setStats] = useState<TofStats | null>(null);
  const [board, setBoard] = useState<{ rows: TofBoardRow[]; minPlays: number }>({ rows: [], minPlays: 10 });
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  // Signed-out passes have nowhere to persist: there is no tof_plays row to
  // write. Without this the deck would re-deal the same top card forever.
  // Guest choices never reach the database; they still drive the deck and the dots.
  const [guestChoices, setGuestChoices] = useState<ReadonlyMap<number, TofChoice>>(() => new Map());
  const slateDate = data?.hand?.slate_date ?? null;
  const guestHydrated = useRef<string | null>(null);
  // Guest choices only ever describe a signed-out visit. Once signed in the
  // database is the record: the in-memory map is dropped so it cannot hide
  // cards that were never written, and the stored stash is consumed by the
  // replay below, which turns every swipe into a real play.
  const isLoggedIn = entitlements.isLoggedIn;
  useEffect(() => {
    if (isLoggedIn) {
      guestHydrated.current = null;
      // Derived-state reset when auth flips (same pattern as loadProfile).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGuestChoices((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }
    if (!slateDate || guestHydrated.current === slateDate) return;
    guestHydrated.current = slateDate;
    setGuestChoices(readGuestChoices(slateDate));
  }, [slateDate, isLoggedIn]);
  useEffect(() => {
    if (isLoggedIn || !slateDate || guestHydrated.current !== slateDate) return;
    writeGuestChoices(slateDate, guestChoices);
  }, [slateDate, guestChoices, isLoggedIn]);
  // "<user>:<hand>" once that user's plays for that hand have loaded. The
  // guest-swipe replay waits for it so it never re-inserts a written play.
  const [playsLoadedFor, setPlaysLoadedFor] = useState<string | null>(null);
  const replayedFor = useRef<string | null>(null);
  const guestNudged = useRef(false);
  // The hero lands folded to its title on every page; the table slides open on a tap.
  const [unfolded, setUnfolded] = useState(false);
  // The fold clips overflow while it slides. Once open and settled the clip
  // comes off so the button glows and card shadows are not cut at the edge.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!unfolded) return;
    const t = setTimeout(() => setSettled(true), FOLD_MS + 50);
    return () => clearTimeout(t);
  }, [unfolded]);
  const toggleFold = useCallback(() => {
    setSettled(false);
    setUnfolded((u) => !u);
  }, []);
  const hand = data?.hand ?? null;
  const handId = hand?.hand_id ?? null;
  const handStatus = hand?.status ?? null;
  // An unswiped deck lands OPEN. The fold exists so the page is not a game
  // you have already played, and that reasoning does not apply to a deck you
  // have not touched: a collapsed title with the leaderboard underneath is a
  // dead end. So once per mount, when this visitor has no swipes on the
  // current hand (guest choices for the slate, or a signed-in user's plays
  // once they have loaded) and the hand is still open, the table slides
  // itself open (which also plays the deck nudge). Anyone who has played the
  // hand, or arrives after it locked, still lands folded. "wait" keeps the
  // decision pending until auth, the hand and the plays are all in.
  const autoOpenDecided = useRef(false);
  useEffect(() => {
    if (autoOpenDecided.current || !slateDate) return;
    const playsKey = userId && handId != null ? `${userId}:${handId}` : null;
    const verdict = shouldLandOpen({
      authReady,
      isLoggedIn,
      slateDate,
      handStatus,
      guestChoiceCount: readGuestChoices(slateDate).size,
      playsOnThisHand: !isLoggedIn ? 0 : playsLoadedFor === playsKey ? plays.length : null,
    });
    if (verdict === "wait") return;
    autoOpenDecided.current = true;
    if (verdict === "fold") return;
    // Derived-state open on first paint (same pattern as the guest-choice
    // reset above): the server renders folded, so this cannot run in render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnfolded(true);
  }, [authReady, isLoggedIn, slateDate, handStatus, userId, handId, playsLoadedFor, plays]);
  // The 60s refetch replaces `data` with a fresh object every minute. The
  // signed-in load must not re-run on that, so it keys on the hand id and
  // reaches the cards it needs through this ref instead of the object.
  const handRef = useRef(hand);
  useEffect(() => { handRef.current = hand; }, [hand]);

  // Clock tick so locks flip without a reload; hand refetch while the hand is not graded.
  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(clock);
  }, []);
  // Pages other than the leaderboard mount the hero with no server hand:
  // paint the session-cached hand at once, then fetch a fresh one.
  useEffect(() => {
    if (initial !== null) return;
    const cached = readHandCache<TofHandResponse>();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cached) setData(cached);
    fetchTofHand().then(setData).catch(() => { /* keep cached or empty */ });
  }, [initial]);
  // Any authoritative answer is cached, including "no hand": a fresh no-hand
  // response must replace a cached deck from yesterday, not leave it in place.
  useEffect(() => { if (data) writeHandCache(data); }, [data]);
  useEffect(() => {
    // Always poll. No hand yet is when it matters most (a visitor who loaded
    // before the daily deal), and a graded hand is not the end either: the
    // next day's hand replaces it at the same endpoint, so a tab left open
    // overnight has to pick up the new deal without a reload.
    const id = setInterval(() => {
      fetchTofHand().then(setData).catch(() => { /* keep last good */ });
    }, REFETCH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Re-read when the hand's status changes too: once grading lands the
    // board's ranks and units move with it, and the rail next to the user's
    // own fresh stats should not be a snapshot from before.
    fetchTofBoard("month").then((b) => setBoard({ rows: b.rows, minPlays: b.min_plays })).catch(() => { /* rail stays empty */ });
  }, [handStatus]);

  // Signed-in loads: plays for this hand, month stats, the stable card.
  useEffect(() => {
    // Resetting to the empty state when auth/hand drop out is the
    // derived-state reset for this branch, not an external-system sync; same
    // pattern as AuthProvider's loadProfile() (pre-existing lint debt here).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!supabase || !userId || handId == null) { setPlays([]); setStats(null); setStable(null); return; }
    let cancelled = false;
    (async () => {
      const { data: rows, error: playsError } = await supabase.from("tof_plays").select("id, hand_id, card_id, stable_pick_id, choice, outcome, units")
        .eq("user_id", userId).eq("hand_id", handId);
      if (playsError) {
        console.error("tof: plays load failed", playsError);
        if (!cancelled) {
          setToast("Could not load your plays. Refresh to try again.");
          setTimeout(() => setToast(null), 3000);
        }
      } else if (!cancelled) {
        setPlays((rows ?? []) as TofPlay[]);
        setPlaysLoadedFor(`${userId}:${handId}`);
      }
      // The column is time_window ("window" is reserved in Postgres); the
      // app-side shape keeps `window`.
      const { data: st, error: statsError } = await supabase.from("tof_tailer_stats").select("time_window, plays, wins, losses, pushes, units, day_streak, best_day_streak")
        .eq("user_id", userId).eq("time_window", "month").maybeSingle();
      if (statsError) {
        // Cosmetic: a missing stats rail is not worth a toast.
        console.error("tof: tailer stats load failed", statsError);
      } else if (!cancelled) {
        const row = st as (Omit<TofStats, "window"> & { time_window: TofStats["window"] }) | null;
        setStats(row ? { window: row.time_window, plays: row.plays, wins: row.wins, losses: row.losses, pushes: row.pushes, units: Number(row.units), day_streak: row.day_streak, best_day_streak: row.best_day_streak } : null);
      }
      const { data: follows, error: followsError } = await supabase.from("capper_follows").select("capper_id, market").eq("user_id", userId);
      if (followsError) {
        // Cosmetic: a missing stable card is not worth a toast. The previous
        // hand's card must still go, or it rides into this hand's summary.
        console.error("tof: capper follows load failed", followsError);
        if (!cancelled) setStable(null);
        return;
      }
      const followRows = (follows ?? []) as { capper_id: number; market: string | null }[];
      const ids = [...new Set(followRows.map((f) => f.capper_id))];
      // A stable pick already played this hand is kept whatever the follow
      // list looks like now, so the no-follows exit waits for that check.
      const playedStableId = ((rows ?? []) as TofPlay[]).find((r) => r.stable_pick_id != null)?.stable_pick_id ?? null;
      if (ids.length === 0 && playedStableId == null) {
        if (!cancelled) setStable(null);
        return;
      }
      // Same follow-scope rule as My Tails (src/app/my-tails/page.tsx): an
      // "all" row tails the whole capper, otherwise only the listed markets
      // count, and a pick with no market_group never matches a scoped
      // capper. Tailing someone for ML must not hand back their spread.
      const whole = new Set(followRows.filter((f) => f.market === "all").map((f) => f.capper_id));
      const scopes = new Map<number, Set<string>>();
      for (const f of followRows) {
        if (f.market === "all" || whole.has(f.capper_id)) continue;
        const set = scopes.get(f.capper_id) ?? new Set<string>();
        if (f.market) set.add(f.market);
        scopes.set(f.capper_id, set);
      }
      const inScope = (p: TodayPickEntry): boolean =>
        whole.has(p.capper_id) || Boolean(p.market_group && scopes.get(p.capper_id)?.has(p.market_group));
      const inHand = new Set((handRef.current?.cards ?? []).map((c) => c.handle));
      const today = ids.length > 0
        ? await fetchTodayPicks(ids).catch(() => ({ date: "", picks: [] as TodayPickEntry[] }))
        : { date: "", picks: [] as TodayPickEntry[] };
      const at = new Date();
      // If the user already played a stable pick this hand, that pick is the
      // stable card (for the dots and the summary) whatever state it is in
      // now; a fresh candidate is only chosen when nothing was played.
      const playedPick = playedStableId != null ? today.picks.find((p) => p.pick_id === playedStableId) : undefined;
      const first = playedStableId != null
        ? (playedPick ? stableFromPick(playedPick, at, true) : null) ?? placeholderStable(playedStableId)
        : today.picks.filter(inScope).map((p) => stableFromPick(p, at)).find((s) => s && !inHand.has(s.handle)) ?? null;
      if (!cancelled) setStable(first);
    })();
    return () => { cancelled = true; };
    // handStatus: when the minute poll sees the hand flip to graded, the
    // plays and stats carry outcomes now and must be read again (a page left
    // open overnight would otherwise show pending results until a reload).
  }, [supabase, userId, handId, handStatus]);

  const playedIds = useMemo(() => new Set(plays.filter((p) => p.card_id != null).map((p) => p.card_id as number)), [plays]);
  const offDeckIds = useMemo(() => {
    if (guestChoices.size === 0) return playedIds;
    const ids = new Set(playedIds);
    for (const id of guestChoices.keys()) ids.add(id);
    return ids;
  }, [playedIds, guestChoices]);
  const stablePlayed = plays.some((p) => p.stable_pick_id != null);
  const seed = userId && hand ? `${userId}:${hand.slate_date}` : null;
  const ordered = useMemo(() => (hand ? orderDeck(hand.cards, offDeckIds, now, seed) : { open: [], locked: [] }), [hand, offDeckIds, now, seed]);
  const open: DeckCard[] = useMemo(() => {
    const shared = ordered.open.map((c) => ({ ...c, kind: "shared" as const }));
    // The stable card was screened for a started game when it was loaded;
    // the 15s clock has to keep screening it, same as the shared cards, or
    // it stays playable past first pitch and the insert bounces off RLS.
    const stableOpen = stable && !stablePlayed && !(stable.game_start_at && isLocked(stable, now));
    return stableOpen ? [...shared, stable] : shared;
  }, [ordered.open, stable, stablePlayed, now]);
  const locked: DeckCard[] = useMemo(() => ordered.locked.map((c) => ({ ...c, kind: "shared" as const })), [ordered.locked]);

  // Deal order with what the user did on each card, for the dots and the summary.
  const progress = useMemo<DeckProgressItem[]>(() => {
    if (!hand) return [];
    const byCard = new Map<number, TofPlay>();
    for (const p of plays) if (p.card_id != null) byCard.set(p.card_id, p);
    // Same order the deck deals, so "Card 2 of 4" and the highlighted dot
    // always mean the card on top.
    const items: DeckProgressItem[] = dealOrder(hand.cards, seed).map((c) => {
      const play = byCard.get(c.id);
      return {
        id: c.id, handle: c.handle ?? "capper", tail_label: c.tail_label, tail_odds: c.tail_odds,
        fade_label: c.fade_label, fade_odds: c.fade_odds_at_deal,
        choice: play?.choice ?? guestChoices.get(c.id) ?? null,
        outcome: play?.outcome ?? null, units: play?.units ?? null,
      };
    });
    if (stable) {
      const sp = plays.find((p) => p.stable_pick_id === stable.pick_id);
      items.push({ id: stable.id, handle: stable.handle ?? "capper", tail_label: stable.tail_label, tail_odds: stable.placeholder ? null : stable.tail_odds,
        fade_label: null, fade_odds: null, choice: sp?.choice ?? guestChoices.get(stable.id) ?? null,
        outcome: sp?.outcome ?? null, units: sp?.units ?? null });
    }
    return items;
  }, [hand, seed, plays, guestChoices, stable]);

  const writePlay = useCallback(async (card: DeckCard, choice: TofChoice): Promise<boolean> => {
    if (!supabase || !userId || !hand) return false;
    // Widen card_id/stable_pick_id to `number | null` explicitly. Left as a
    // ternary of two object literals, TS infers each branch's *literal* shape
    // (card_id: number vs card_id: null), which supabase-js's insert() then
    // rejects as excess-property mismatches against the other branch's shape.
    const row: { user_id: string; hand_id: number; card_id: number | null; stable_pick_id: number | null; choice: TofChoice } = card.kind === "shared"
      ? { user_id: userId, hand_id: hand.hand_id, card_id: card.id, stable_pick_id: null, choice }
      : { user_id: userId, hand_id: hand.hand_id, card_id: null, stable_pick_id: card.pick_id, choice };
    const { error } = await supabase.from("tof_plays").insert(row);
    if (error) {
      setToast(error.code === "23505" ? "Already played." : /policy|violates/i.test(error.message) ? "That card just locked." : "Could not save that play. Try again.");
      setTimeout(() => setToast(null), 3000);
      const { data: rows, error: reReadError } = await supabase.from("tof_plays").select("id, hand_id, card_id, stable_pick_id, choice, outcome, units")
        .eq("user_id", userId).eq("hand_id", hand.hand_id);
      if (reReadError) {
        console.error("tof: plays re-read failed after insert error", reReadError);
        setToast("Could not load your plays. Refresh to try again.");
        setTimeout(() => setToast(null), 3000);
      } else {
        setPlays((rows ?? []) as TofPlay[]);
      }
      return false;
    }
    setPlays((prev) => [...prev, { id: -Date.now(), hand_id: hand.hand_id, card_id: row.card_id, stable_pick_id: row.stable_pick_id, choice, outcome: null, units: null }]);
    return true;
  }, [supabase, userId, hand]);

  const onPlay = useCallback(async (card: DeckCard, choice: TofChoice): Promise<boolean> => {
    if (!entitlements.isLoggedIn) {
      // Guest mode: every swipe moves the deck, nothing is written. Choices
      // live in local state (persisted per slate) so the deck never hands the
      // same card back, and every one of them becomes a real play after
      // sign-in. The first tail or fade nudges once.
      setGuestChoices((prev) => { const next = new Map(prev); next.set(card.id, choice); return next; });
      // Telemetry only, fire-and-forget: without it a guest who swipes the
      // whole deck and never signs in leaves no trace anywhere, and an empty
      // tof_plays reads the same as an empty site.
      if (hand && card.kind === "shared") {
        logGuestSwipe({ handId: hand.hand_id, cardId: card.id, choice });
      }
      if (choice !== "pass") {
        if (!guestNudged.current) {
          guestNudged.current = true;
          setToast("Sign in to keep score.");
          setTimeout(() => setToast(null), 4000);
        }
      }
      return true;
    }
    if (choice !== "pass") {
      const ok = await requireUsername();
      if (!ok) return false;
    }
    return writePlay(card, choice);
  }, [entitlements.isLoggedIn, hand, requireUsername, writePlay]);

  const signIn = useCallback(() => {
    document.cookie = `${RETURN_COOKIE}=${encodeURIComponent("/")}; path=/; max-age=1800; samesite=lax`;
    router.push("/login");
  }, [router]);

  // The conversion half of the guest funnel: this browser swiped as a guest
  // at some point and now has an account. Once per signed-in user, and a
  // no-op when this browser has no stored guest id. Kept separate from the
  // replay below because a guest can swipe on one day and sign in on another,
  // when there is no stash left to replay but the conversion still happened.
  const convertedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || convertedFor.current === userId) return;
    convertedFor.current = userId;
    markGuestConverted();
  }, [userId]);

  // After login: every swipe made as a guest on this slate becomes a real
  // play, in deal order, once this user's plays have loaded (so nothing is
  // written twice). Cards that locked or were already played are skipped.
  // The username gate runs ONCE up front (going through onPlay per card
  // would re-open the claim modal with a stale closure after the first
  // claim). A dismissed prompt stops the run and keeps the stash for the
  // next attempt; a completed run clears it.
  useEffect(() => {
    const key = userId && handId != null ? `${userId}:${handId}` : null;
    if (!key || !hand || playsLoadedFor !== key || replayedFor.current === key) return;
    replayedFor.current = key;
    const stash = readGuestChoices(hand.slate_date);
    if (stash.size === 0) { clearGuestChoices(); return; }
    const at = new Date();
    const todo = hand.cards
      .map((card) => ({ card, choice: stash.get(card.id) }))
      .filter((x): x is { card: TofCard; choice: TofChoice } => !!x.choice && !isLocked(x.card, at) && !playedIds.has(x.card.id));
    if (todo.length === 0) { clearGuestChoices(); return; }
    (async () => {
      // Writes first, username prompt after: see replayGuestPicks.
      const { written, ok } = await replayGuestPicks({
        todo,
        writePlay: (card, choice) => writePlay({ ...card, kind: "shared" }, choice),
        requireUsername: () => { void requireUsername(); },
      });
      if (!ok) { replayedFor.current = null; return; }
      clearGuestChoices();
      if (written > 0) {
        setToast(`${written} pick${written === 1 ? "" : "s"} saved to your account.`);
        setTimeout(() => setToast(null), 4000);
      }
    })();
  }, [userId, handId, hand, playsLoadedFor, playedIds, requireUsername, writePlay]);

  const me = profile?.username && stats
    ? { username: profile.username, stats, avatar_url: displayAvatar(profile, capper), capper_handle: capper?.handle ?? null }
    : null;
  const state: "loading" | "no-hand" | "playable" | "spectator" = data === null ? "loading" : !hand ? "no-hand" : open.length > 0 ? "playable" : "spectator";

  return (
    <section className="mx-[calc(50%-50vw)] border-b border-[var(--color-border)] px-[max(16px,calc(50vw-620px))] pb-3 pt-3 transition-[padding] duration-500 data-[open=true]:pb-10 data-[open=true]:pt-6 data-[open=true]:sm:pb-12 data-[open=true]:sm:pt-7" style={{ background: FELT }} data-open={unfolded}>
      <TofTitle open={unfolded} onToggle={toggleFold} />

      <div className="tof-fold" data-open={unfolded} data-settled={settled} id="tof-table">
      <div>
      <div className="tof-fold-inner mx-auto grid max-w-[1240px] grid-cols-1 gap-8 pt-6 lg:grid-cols-[280px_minmax(0,1fr)_300px] lg:items-start" inert={!unfolded}>
        <aside className="order-3 flex flex-col gap-2 lg:order-1">
          <div className="rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(9,11,12,0.72)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] px-4 py-4">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">The game</div>
            <div className="mt-2 font-[family-name:var(--font-display)] text-[19px] leading-tight text-[var(--color-text)]">Think you can out-pick the cappers?</div>
            <p className="mt-2 text-[12.5px] leading-snug text-[var(--color-text-soft)]">
              Every day we deal a hand of real picks from cappers we track. Tail the ones you trust, fade the ones you don&apos;t.
              Your calls get graded the same way theirs do, and you land on the tailer board right next to them.
            </p>
            <p className="mt-2 text-[11.5px] leading-snug text-[var(--color-text-muted)]">
              Free to play. Nothing is wagered and nothing pays out. Units are just how we keep score.
            </p>
            <p className="mt-2 text-[11.5px] font-bold leading-snug text-[var(--color-text-soft)]">
              New deck at 11 AM PT on weekdays, 9 AM PT on weekends.
            </p>
            <div className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">How it works</div>
            <ol className="mt-3 flex flex-col gap-3">
              {[
                ["Swipe", "Right to tail, left to fade, up to pass."],
                ["Price", "Tails are scored at the capper's odds, fades at the Pinnacle close."],
                ["Grade", "1u a card. Results land overnight."],
              ].map(([head, body], i) => (
                <li key={head} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(25,245,124,0.12)] font-[family-name:var(--font-display)] text-[15px] text-[var(--color-pos)]">{i + 1}</span>
                  <div>
                    <div className="text-[13px] font-extrabold">{head}</div>
                    <div className="text-[12px] leading-snug text-[var(--color-text-soft)]">{body}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <div className="order-1 flex flex-col items-center lg:order-2">
          {state === "loading" ? (
            <div className="flex h-[300px] w-[360px] max-w-full items-center justify-center rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(9,11,12,0.72)] text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Dealing the hand
            </div>
          ) : state === "no-hand" ? (
            <div className="flex h-[300px] w-[360px] max-w-full flex-col items-center justify-center gap-2 rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(9,11,12,0.72)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-center">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">No hand today</div>
              <div className="text-[13px] text-[var(--color-text-soft)]">{NO_HAND_COPY[data?.no_hand_reason ?? ""] ?? data?.no_hand_reason ?? "Not enough picks yet."}</div>
              <div className="text-[13px] font-bold text-[var(--color-pos)]">{nextDealLabel(data?.next_deal ?? null)}</div>
            </div>
          ) : (
            <TofDeck open={open} locked={locked} onPlay={onPlay} progress={progress} nudge={unfolded} />
          )}
          <Suspense fallback={null}>
            <CallbackErrorBanner className="mt-3" />
          </Suspense>
          <div role="status" aria-live="polite">
            {toast && <div className="mt-3 rounded-lg border border-[var(--color-border-h)] bg-[#121216] px-3 py-2 text-[12px] font-semibold">{toast}</div>}
          </div>
        </div>

        <aside className="order-2 flex flex-col gap-3 lg:order-3">
          {entitlements.isLoggedIn ? (
            <div className="flex items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(9,11,12,0.72)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] px-4 py-3.5">
              {displayAvatar(profile, capper) ? (
                <BoardAvatar url={displayAvatar(profile, capper)} name={profile?.username ?? session?.user?.email ?? "?"} size={40} />
              ) : (
                <Link href="/account" aria-label="Add a photo" title="Add a photo" className="shrink-0">
                  <BoardAvatar url={null} name={profile?.username ?? session?.user?.email ?? "?"} size={40} />
                </Link>
              )}
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Playing as</div>
                <div className="truncate text-[15px] font-extrabold">{profile?.username ?? "pick a username"}</div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[rgba(25,245,124,0.35)] bg-[rgba(9,11,12,0.72)] px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
              <div className="font-[family-name:var(--font-display)] text-[20px] leading-tight">Keep score.</div>
              <button type="button" onClick={signIn} className="mt-3 flex h-11 w-full items-center justify-center rounded-full bg-[var(--color-pos)] font-[family-name:var(--font-display)] text-[17px] tracking-[0.06em] text-[#0a0a0c] shadow-[0_4px_0_#0f9a4c] transition-transform active:translate-y-[3px] active:shadow-none">
                SIGN IN
              </button>
            </div>
          )}
          {stats && (
            <div className="grid grid-cols-3 gap-2.5 rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(9,11,12,0.72)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] px-4 py-3.5">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Month</div>
                <div className="mt-1 text-[22px] font-extrabold leading-none tabular-nums">{stats.wins}-{stats.losses}</div>
                <div className={`mt-1 text-[11px] font-bold ${stats.units >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}`}>{unitsLabel(stats.units)}</div>
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Plays</div>
                <div className="mt-1 text-[22px] font-extrabold leading-none tabular-nums">{stats.plays}</div>
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Streak</div>
                <div className={`mt-1 font-[family-name:var(--font-display)] text-[24px] leading-none ${stats.day_streak > 0 ? "text-[var(--color-gold)]" : stats.day_streak < 0 ? "text-[#7dd3fc]" : ""}`}>
                  {stats.day_streak > 0 ? `W${stats.day_streak}` : stats.day_streak < 0 ? `L${-stats.day_streak}` : "even"}
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">best W{stats.best_day_streak}</div>
              </div>
            </div>
          )}
          <TofBoard rows={board.rows} me={me} minPlays={board.minPlays} />
        </aside>
      </div>
      </div>
      </div>
    </section>
  );
}

/** The game's title: stencil block caps, set straight, with a small "or"
    between the two big words. It is the fold's handle: it bobs while the
    table is closed and opens it on a tap. */
function TofTitle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="tof-table"
      className="group mx-auto flex cursor-pointer select-none flex-col items-center bg-transparent p-0 focus-visible:outline-none"
    >
      {open && (
        <span className="pp-rise mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-text-muted)]" aria-hidden="true">
          Tap to close
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5 5 3.5 8 6.5" /></svg>
        </span>
      )}
      <h2 className={`flex items-baseline justify-center gap-3 font-[family-name:var(--font-display)] leading-none text-[var(--color-text)] transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[0.98] ${open ? "" : "tof-bob"}`} style={{ textShadow: "0 3px 0 #0a0a0c, 0 10px 24px rgba(0,0,0,0.55)" }}>
        <span className="text-[46px] tracking-[0.01em] text-[var(--color-pos)] sm:text-[60px]">TAIL</span>
        <span className="text-[22px] tracking-[0.06em] text-white sm:text-[28px]">OR</span>
        <span className="text-[46px] tracking-[0.01em] text-[var(--color-neg)] sm:text-[60px]">FADE</span>
      </h2>
      {!open && (
        <span className="tof-hint mt-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-text-muted)]" aria-hidden="true">
          Tap to play
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3.5 5 6.5 8 3.5" /></svg>
        </span>
      )}
    </button>
  );
}
