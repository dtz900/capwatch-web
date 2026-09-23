"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUsernameClaim } from "@/components/auth/UsernameClaim";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { fetchTofBoard, fetchTofHand, fetchTodayPicks } from "@/lib/api";
import { clearPendingPlay, isLocked, orderDeck, readPendingPlay, unitsLabel, writePendingPlay } from "@/lib/tof/deck";
import type { TofBoardRow, TofChoice, TofHandResponse, TofPlay, TofStats, TodayPickEntry } from "@/lib/types";
import { TofDeck, type DeckCard, type DeckProgressItem, type StableDeckCard } from "@/components/tof/TofDeck";
import { TofBoard } from "@/components/tof/TofBoard";

const RETURN_COOKIE = "ts_return_to";

const FELT = "radial-gradient(ellipse 62% 120% at 50% 40%, #12432f 0%, #0c2f22 45%, #071c15 72%, #0a0a0c 100%)";
const REFETCH_MS = 60_000;

/* The stable card is the user's own tail, offered alongside the shared hand.
   It has to clear the same bar a dealt card does: still ungraded, priced at
   the odds the platform will grade it at, and not already under way. */
function stableFromPick(p: TodayPickEntry, now: Date): StableDeckCard | null {
  if (p.kind !== "straight" || p.pick_id == null) return null;
  if (p.outcome != null) return null; // already graded, nothing left to tail
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
  if (p.commence_time && isLocked(card, now)) return null;
  return card;
}

function nextDealLabel(next: { date: string; expected_at: string | null } | null): string {
  if (!next) return "";
  if (next.expected_at) {
    const t = new Date(next.expected_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
    return `Deals at ${t} PT`;
  }
  const d = new Date(`${next.date}T12:00:00Z`);
  return `Next deal ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function TofHero({ initial }: { initial: TofHandResponse | null }) {
  const router = useRouter();
  const { session, profile, entitlements } = useAuth();
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
  const pendingHandled = useRef(false);
  const guestNudged = useRef(false);

  const hand = data?.hand ?? null;
  const handId = hand?.hand_id ?? null;
  const handStatus = hand?.status ?? null;
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
  useEffect(() => {
    // No hand yet is exactly when polling matters most: a visitor who loaded
    // the page before the daily deal (or during an API blip) should get the
    // hand without a reload. Only a graded hand has nothing left to fetch.
    if (handStatus === "graded") return;
    const id = setInterval(() => {
      fetchTofHand().then(setData).catch(() => { /* keep last good */ });
    }, REFETCH_MS);
    return () => clearInterval(id);
  }, [handStatus]);

  useEffect(() => {
    fetchTofBoard("month").then((b) => setBoard({ rows: b.rows, minPlays: b.min_plays })).catch(() => { /* rail stays empty */ });
  }, []);

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
      }
      const { data: st, error: statsError } = await supabase.from("tof_tailer_stats").select("window, plays, wins, losses, pushes, units, day_streak, best_day_streak")
        .eq("user_id", userId).eq("window", "month").maybeSingle();
      if (statsError) {
        // Cosmetic: a missing stats rail is not worth a toast.
        console.error("tof: tailer stats load failed", statsError);
      } else if (!cancelled) {
        setStats((st as TofStats | null) ?? null);
      }
      const { data: follows, error: followsError } = await supabase.from("capper_follows").select("capper_id, market").eq("user_id", userId);
      if (followsError) {
        // Cosmetic: a missing stable card is not worth a toast.
        console.error("tof: capper follows load failed", followsError);
        return;
      }
      const followRows = (follows ?? []) as { capper_id: number; market: string | null }[];
      const ids = [...new Set(followRows.map((f) => f.capper_id))];
      if (ids.length === 0) return;
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
      const today = await fetchTodayPicks(ids).catch(() => ({ date: "", picks: [] as TodayPickEntry[] }));
      const at = new Date();
      const first = today.picks.filter(inScope).map((p) => stableFromPick(p, at)).find((s) => s && !inHand.has(s.handle)) ?? null;
      if (!cancelled) setStable(first);
    })();
    return () => { cancelled = true; };
  }, [supabase, userId, handId]);

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
    return stable && !stablePlayed ? [...shared, stable] : shared;
  }, [ordered.open, stable, stablePlayed]);
  const locked: DeckCard[] = useMemo(() => ordered.locked.map((c) => ({ ...c, kind: "shared" as const })), [ordered.locked]);

  // Deal order with what the user did on each card, for the dots and the summary.
  const progress = useMemo<DeckProgressItem[]>(() => {
    if (!hand) return [];
    const byCard = new Map<number, TofChoice>();
    for (const p of plays) if (p.card_id != null) byCard.set(p.card_id, p.choice);
    for (const [id, c] of guestChoices) if (!byCard.has(id)) byCard.set(id, c);
    const items: DeckProgressItem[] = hand.cards.map((c) => ({
      id: c.id, handle: c.handle ?? "capper", tail_label: c.tail_label, tail_odds: c.tail_odds,
      fade_label: c.fade_label, fade_odds: c.fade_odds_at_deal, choice: byCard.get(c.id) ?? null,
    }));
    if (stable) {
      const sp = plays.find((p) => p.stable_pick_id === stable.pick_id);
      items.push({ id: stable.id, handle: stable.handle ?? "capper", tail_label: stable.tail_label, tail_odds: stable.tail_odds,
        fade_label: null, fade_odds: null, choice: sp?.choice ?? guestChoices.get(stable.id) ?? null });
    }
    return items;
  }, [hand, plays, guestChoices, stable]);

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
      // Guest mode: every swipe moves the deck, nothing is written. The
      // dismissal lives in local state or the deck hands the same card back
      // forever. A tail or fade is stashed so the latest one lands after
      // sign-in if that card is still open, and the first one nudges once.
      setGuestChoices((prev) => { const next = new Map(prev); next.set(card.id, choice); return next; });
      if (choice !== "pass") {
        if (card.kind === "shared" && hand) writePendingPlay({ cardId: card.id, choice, slateDate: hand.slate_date });
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

  // After login: replay the stashed choice if that card is still open.
  useEffect(() => {
    if (pendingHandled.current || !entitlements.isLoggedIn || !hand || !profile) return;
    const pending = readPendingPlay();
    if (!pending) return;
    pendingHandled.current = true;
    clearPendingPlay();
    const card = hand.cards.find((c) => c.id === pending.cardId);
    if (!card || pending.slateDate !== hand.slate_date || isLocked(card, new Date()) || playedIds.has(card.id)) return;
    // onPlay is the same play-writing path a user click drives; replaying a
    // stashed pending play after login has to run once when auth/hand become
    // ready, which is an effect by nature.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void onPlay({ ...card, kind: "shared" }, pending.choice);
  }, [entitlements.isLoggedIn, hand, profile, playedIds, onPlay]);

  const me = profile?.username && stats ? { username: profile.username, stats } : null;
  const state: "no-hand" | "playable" | "spectator" = !hand ? "no-hand" : open.length > 0 ? "playable" : "spectator";

  return (
    <section className="mx-[calc(50%-50vw)] border-b border-[var(--color-border)] px-[max(16px,calc(50vw-620px))] pb-10 pt-6 sm:pb-12 sm:pt-7" style={{ background: FELT }}>
      <TofTitle />

      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)_300px] lg:items-start">
        <aside className="order-3 flex flex-col gap-2 lg:order-1">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-4">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">How it works</div>
            <ol className="mt-3 flex flex-col gap-3">
              {[
                ["Swipe", "Right to tail, left to fade, up to pass."],
                ["Price", "Tails pay the capper's odds. Fades pay the Pinnacle close."],
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
          {state === "no-hand" ? (
            <div className="flex h-[300px] w-[360px] max-w-full flex-col items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-center">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">No hand today</div>
              <div className="text-[13px] text-[var(--color-text-soft)]">{data?.no_hand_reason ?? "Not enough picks yet."}</div>
              <div className="text-[13px] font-bold text-[var(--color-pos)]">{nextDealLabel(data?.next_deal ?? null)}</div>
            </div>
          ) : (
            <TofDeck open={open} locked={locked} onPlay={onPlay} progress={progress} />
          )}
          <div role="status" aria-live="polite">
            {toast && <div className="mt-3 rounded-lg border border-[var(--color-border-h)] bg-[#121216] px-3 py-2 text-[12px] font-semibold">{toast}</div>}
          </div>
        </div>

        <aside className="order-2 flex flex-col gap-3 lg:order-3">
          {entitlements.isLoggedIn ? (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border-h)] bg-[#2a2a33] font-[family-name:var(--font-display)] text-[16px] text-[var(--color-pos)]">
                {(profile?.username ?? session?.user?.email ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Playing as</div>
                <div className="truncate text-[15px] font-extrabold">{profile?.username ?? "pick a username"}</div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[rgba(25,245,124,0.25)] bg-[rgba(25,245,124,0.05)] px-4 py-4">
              <div className="font-[family-name:var(--font-display)] text-[20px] leading-tight">Keep score.</div>
              <button type="button" onClick={signIn} className="mt-3 flex h-11 w-full items-center justify-center rounded-full bg-[var(--color-pos)] font-[family-name:var(--font-display)] text-[17px] tracking-[0.06em] text-[#0a0a0c] shadow-[0_4px_0_#0f9a4c] transition-transform active:translate-y-[3px] active:shadow-none">
                SIGN IN
              </button>
            </div>
          )}
          {stats && (
            <div className="grid grid-cols-3 gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3.5">
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
    </section>
  );
}

/** The game's title: chunky game-show caps, set straight, with a small "or" between the two big words. */
function TofTitle() {
  return (
    <h2 className="mb-6 flex items-baseline justify-center gap-3 font-[family-name:var(--font-display)] leading-none text-[var(--color-text)]" style={{ textShadow: "0 3px 0 #0a0a0c, 0 10px 24px rgba(0,0,0,0.55)" }}>
      <span className="text-[52px] tracking-[0.02em] text-[var(--color-pos)] sm:text-[64px]">TAIL</span>
      <span className="text-[26px] tracking-[0.08em] text-white sm:text-[32px]">OR</span>
      <span className="text-[52px] tracking-[0.02em] text-[var(--color-neg)] sm:text-[64px]">FADE</span>
    </h2>
  );
}
