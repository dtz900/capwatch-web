import { fetchSlate, withDeadline, type SlateSport } from "./api";
import { withKvCache, readLastKnownGood } from "./kv-cache";
import { currentSlateDay } from "./week-standings";
import { tonightGameCount, type TonightCounts } from "./slate-tonight";

const SPORTS: readonly SlateSport[] = ["nfl", "nba", "mlb"];

// Counts change slowly (a game finishing, a postponement), so they get their
// own KV entry well above the 15s slate TTL: a cold read fans out three slate
// fetches, and this keeps that to once every couple of minutes site-wide.
const TONIGHT_TTL_SEC = 120;
// The picker signal must never hold the board: past this, render without it
// and let the fetch finish in the background to warm KV for the next render.
const TONIGHT_DEADLINE_MS = 1_500;

async function readTonightCounts(day: string): Promise<TonightCounts> {
  const settled = await Promise.allSettled(SPORTS.map((s) => fetchSlate("today", s)));
  const out: TonightCounts = {};
  settled.forEach((r, i) => {
    const sport = SPORTS[i];
    if (r.status === "fulfilled") {
      out[sport] = tonightGameCount(r.value, sport, day);
      return;
    }
    const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
    console.warn(`[slate] tonight counts: ${sport} slate failed: ${msg}`);
  });
  return out;
}

/**
 * Tonight's non-final game count for every league, for the slate picker
 * signal. A cold read can run long (the NFL slate alone has taken 8s
 * upstream), so past the deadline this serves the day's last-known-good
 * copy and lets the live read finish in the background.
 */
export async function fetchTonightCounts(): Promise<TonightCounts> {
  const day = currentSlateDay();
  const key = `slate:tonight:v1:${day}`;
  const live = await withDeadline<TonightCounts | null>(
    withKvCache<TonightCounts>(key, TONIGHT_TTL_SEC, () => readTonightCounts(day)),
    TONIGHT_DEADLINE_MS,
    null,
  );
  if (live) return live;
  return (await readLastKnownGood<TonightCounts>(key)) ?? {};
}
