// Duplicate check for the admin screens. The API refuses to approve, grade or
// enter a pick the capper already has live on the same game, side and line.
// Single calls answer 409 with a readable `detail`; batch approve answers 200
// with `refused_duplicates`. Both are turned into the same DuplicateEntry here.

/** A pick the capper already has live (API field `live_twin`). */
export interface LiveTwin {
  pick_id: number;
  raw_id: number | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  units: number | null;
  posted_at: string | null;
  tweet_id: string | null;
  tweet_url: string | null;
  /** Older spelling of differs_in_units, kept so either backend shape works. */
  units_differ?: boolean;
  differs_in_units?: boolean;
  differs_in_price?: boolean;
  this_units?: number | null;
  this_odds?: number | null;
}

/** One entry of the batch approve `refused_duplicates` list. */
export interface RefusedDuplicate {
  pick_id: number;
  reason: string;
  same_batch: boolean;
  live_twin: LiveTwin | null;
}

/** What the screens show for one refused pick. */
export interface DuplicateEntry {
  pickId: number;
  /** The other copy was approved in this same batch and kept. */
  sameBatch: boolean;
  existingPickId: number | null;
  /** Plain description of the existing pick, e.g. "Saint Joes +6.5, 1u, posted Nov 11, 11:48 AM". */
  existing: string;
  tweetUrl: string | null;
  /** Sentence about price or stake differing, or null. */
  differs: string | null;
  /** The API's own sentence, used when nothing better could be built. */
  reason: string;
}

export const DUPLICATE_DETAIL_START = /^(?:Already live as pick|Duplicate of pick) (\d+)/;

/** Pulls the `detail` text out of a failed call. The server actions report
 * "<status>: <body>" where body is the API's JSON; a bare detail string is
 * also accepted. Returns null when the text is not a duplicate refusal. */
export function parseDuplicateDetail(error: string): string | null {
  let text = error.trim();
  const status = /^(\d{3}):\s*/.exec(text);
  if (status) {
    if (status[1] !== "409") return null;
    text = text.slice(status[0].length);
  }
  let detail = text;
  if (text.startsWith("{")) {
    try {
      const body = JSON.parse(text) as { detail?: unknown };
      if (typeof body.detail !== "string") return null;
      detail = body.detail;
    } catch {
      return null;
    }
  }
  return DUPLICATE_DETAIL_START.test(detail) ? detail : null;
}

const TWEET_HOSTS = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]);

/** "x.com/handle/status/1" -> "https://x.com/handle/status/1". Only x.com and
 * twitter.com links are links; any other host (or scheme) is not. */
export function absoluteTweetUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  const full = /^https?:\/\//i.test(t) ? t : /^[a-z0-9.-]+\//i.test(t) ? `https://${t}` : null;
  if (!full) return null;
  try {
    const u = new URL(full);
    return TWEET_HOSTS.has(u.hostname.toLowerCase()) ? u.toString() : null;
  } catch {
    return null;
  }
}

const fmtUnits = (u: number | null | undefined) => (u == null ? "no stake" : `${u}u`);
const fmtOdds = (o: number | null | undefined) => (o == null ? "no odds" : o > 0 ? `+${o}` : String(o));

export const SECOND_BET_SENTENCE = "This may be a deliberate second bet.";

const fmtOddsText = (t: string) => (/^\d/.test(t) ? `+${t}` : t);

/** Builds the entry for a refusal from the API's sentence (`refusal_text` in
 * the platform's core/live_twin.py). Every part after the selection is optional:
 *   Already live as pick N ('SEL'[ line L][ odds O][ units U][, posted MM-DD HH:MM UTC][, x.com/h/status/ID]).
 *   [ Price or stake differs: this one ODDS, UNITS vs ODDS, UNITS. May be a deliberate second bet.]
 * The lead is "Duplicate of pick N in this batch" for a same-batch copy.
 * A string that does not fit stays a plain sentence (`reason`, no JSON, no status). */
export function entryFromDetail(pickId: number, detail: string): DuplicateEntry {
  const plain: DuplicateEntry = {
    pickId,
    sameBatch: false,
    existingPickId: null,
    existing: "",
    tweetUrl: null,
    differs: null,
    reason: detail,
  };
  const head = /^(Already live as pick|Duplicate of pick) (\d+)(?: in this batch)? \(([\s\S]*)\)\.(?:\s+([\s\S]*))?$/.exec(detail);
  if (!head) {
    const id = DUPLICATE_DETAIL_START.exec(detail);
    return { ...plain, existingPickId: id ? Number(id[1]) : null };
  }
  const [, lead, id, inner, tail = ""] = head;
  let rest = inner;
  let tweetUrl: string | null = null;
  const url = /,\s*((?:x|twitter)\.com\/[^\s,]+)$/i.exec(rest);
  if (url) {
    tweetUrl = absoluteTweetUrl(url[1]);
    rest = rest.slice(0, url.index);
  }
  let posted = "";
  const when = /,\s*posted (\d\d-\d\d \d\d:\d\d UTC)$/.exec(rest);
  if (when) {
    posted = when[1];
    rest = rest.slice(0, when.index);
  }
  const parts = /^'([\s\S]*)'(?: line (\S+))?(?: odds (\S+))?(?: units (\S+))?$/.exec(rest);
  let existing = "";
  if (parts) {
    const bits = [parts[1]];
    if (parts[3]) bits.push(fmtOddsText(parts[3]));
    if (parts[4]) bits.push(`${parts[4]}u`);
    existing = bits.join(", ") + (posted ? `, posted ${posted}` : "");
  }
  let differs: string | null = null;
  if (tail) {
    const diff = /^Price or stake differs: this one (no odds|\S+), (no units|\S+) vs (no odds|\S+), (no units|\S+)\./.exec(tail);
    if (diff) {
      const mine = `${fmtOddsText(diff[1])}, ${diff[2]}`;
      const live = `${fmtOddsText(diff[3])}, ${diff[4]}`;
      differs = `Price or stake differs: this one is ${mine}, the live one is ${live}. ${SECOND_BET_SENTENCE}`;
    }
  }
  return {
    pickId,
    sameBatch: lead === "Duplicate of pick",
    existingPickId: Number(id),
    existing,
    tweetUrl,
    differs,
    reason: detail,
  };
}

/** One line naming the existing pick: the parsed description, else the API's own sentence. */
export function existingLine(e: DuplicateEntry): string {
  return e.existing ? `Already live as #${e.existingPickId ?? "?"}: ${e.existing}` : e.reason;
}

/** Differences between the held pick and its live twin as display strings. */
export function twinDifferences(
  t: LiveTwin,
  mine: { odds: number | null; units: number | null },
): { price: { mine: string; live: string } | null; stake: { mine: string; live: string } | null } {
  const price = t.differs_in_price === true;
  const stake = t.differs_in_units === true || t.units_differ === true;
  const myOdds = t.this_odds !== undefined ? t.this_odds : mine.odds;
  const myUnits = t.this_units !== undefined ? t.this_units : mine.units;
  return {
    price: price ? { mine: fmtOdds(myOdds), live: fmtOdds(t.odds_taken) } : null,
    stake: stake ? { mine: fmtUnits(myUnits), live: fmtUnits(t.units) } : null,
  };
}

/** Builds the entry for one batch refusal. `label` formats a posted time. */
export function entryFromRefused(r: RefusedDuplicate, label: (iso: string) => string): DuplicateEntry {
  const t = r.live_twin;
  if (!t) return { ...entryFromDetail(r.pick_id, r.reason), sameBatch: r.same_batch };
  const bits = [t.selection ?? "Untitled pick"];
  if (t.odds_taken != null) bits.push(fmtOdds(t.odds_taken));
  if (t.units != null) bits.push(`${t.units}u`);
  const when = t.posted_at ? label(t.posted_at) : "";
  const existing = bits.join(", ") + (when ? `, posted ${when}` : "");
  const d = twinDifferences(t, { odds: null, units: null });
  const diffs = [
    d.price && `price ${d.price.mine} vs ${d.price.live}`,
    d.stake && `stake ${d.stake.mine} vs ${d.stake.live}`,
  ].filter(Boolean);
  return {
    pickId: r.pick_id,
    sameBatch: r.same_batch,
    existingPickId: t.pick_id,
    existing,
    tweetUrl: absoluteTweetUrl(t.tweet_url),
    differs: diffs.length ? `This one and the live one differ: ${diffs.join(", ")}. ${SECOND_BET_SENTENCE}` : null,
    reason: r.reason,
  };
}
