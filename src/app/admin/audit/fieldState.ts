import type { AuditProblem } from "@/lib/api";
import type { MarketDef } from "./actions";

export type FieldKey = "player" | "game" | "market" | "line" | "odds" | "stake";

export interface FieldState {
  key: FieldKey;
  label: string;
  value: string | null;
  red: boolean;
  note: string | null;
  /** Set by the editor once the field was fixed this session; it no longer counts as remaining. */
  fixed?: boolean;
}

const NOT_BOUND = "Not bound";
const REVIEW_NOT_BOUND = "Not bound. Approve needs a game. Pick it here or reject.";
const NONE_ATTACHED = "None attached";
const NO_NUMBER = "No number in the tweet";
const NEXT_DAY = "Player was not in this game's box. Usually the tweet was for the next day.";

function isNcaab(p: AuditProblem): boolean {
  return (p.sport ?? "").toUpperCase() === "NCAAB";
}

/** An NCAAB row marked as a player prop has no Player row to fix: delete-only. */
export function isStrayNcaabProp(p: AuditProblem): boolean {
  return isNcaab(p) && p.bet_kind === "player";
}

function signedOdds(odds: number | null): string | null {
  if (odds == null) return null;
  return odds > 0 ? `+${odds}` : String(odds);
}

/** The pick's market definition, when the sport's markets are loaded and match. */
function marketDef(p: AuditProblem, markets: MarketDef[] | null): MarketDef | null {
  if (!markets) return null;
  const name = p.stat_name ?? p.market;
  return markets.find((m) => m.stat_name === name) ?? null;
}

/** Unknown market list or no match: assume a line is needed. */
function takesLine(p: AuditProblem, markets: MarketDef[] | null): boolean {
  const hit = marketDef(p, markets);
  return hit ? hit.takes_line : true;
}

/**
 * A market the grader settles without a number: a moneyline (takes_line
 * false) or a yes/no prop seeded with a default_line (triple_double at
 * 0.5). The backend's "missing_line" reason is overridden for these; F5 ML
 * picks sat under "Line missing" for months because it was not
 * (David 2026-11-06: "first 5 ml doesnt have a line").
 */
export function lineNotNeeded(p: AuditProblem, markets: MarketDef[] | null): string | null {
  const hit = marketDef(p, markets);
  if (!hit) return null;
  if (!hit.takes_line) return "No line for this market";
  if (hit.default_line != null) return `Defaults to ${hit.default_line}`;
  return null;
}

export interface StateOpts {
  /** Readable label for the bound game (teams and date). */
  gameLabel?: string | null;
  /** Markets failed to load: whether the pick takes a line is unknown, so it cannot be red. */
  marketsError?: boolean;
  /** "review" relaxes the Game (parlay legs), Player and Line rules for the review queue. Default "audit". */
  mode?: "audit" | "review";
  /** Review mode: why the resolved player does not fit this game; makes Player red. */
  playerMismatch?: string | null;
}

export function fieldStates(
  p: AuditProblem & { game_label?: string | null },
  markets: MarketDef[] | null,
  opts: StateOpts = {},
): FieldState[] {
  const review = opts.mode === "review";
  const gameRed = review
    ? p.game_id == null && p.parlay_id == null
    : p.reason === "missing_game_id" || p.reason === "player_did_not_play" || p.game_id == null;
  const gameNote = review ? REVIEW_NOT_BOUND : p.reason === "player_did_not_play" ? NEXT_DAY : NOT_BOUND;

  const playerMismatch = review ? (opts.playerMismatch ?? null) : null;
  const playerRed = review
    ? playerMismatch != null
    : p.reason === "missing_player_id" || (p.bet_kind === "player" && p.player_id == null);
  const marketRed = p.reason === "market_unhandled";
  const lineUnknown = !!opts.marketsError && p.line == null;
  const noLine = p.line == null ? lineNotNeeded(p, markets) : null;
  const lineRed =
    !review &&
    noLine == null &&
    (p.reason === "missing_line" || (p.line == null && !opts.marketsError && takesLine(p, markets)));

  const states: FieldState[] = [];

  if (!isNcaab(p)) {
    states.push({
      key: "player",
      label: "Player",
      value: p.player_name ?? (p.player_id != null ? `id ${p.player_id}` : null),
      red: playerRed,
      note: playerRed ? (playerMismatch ?? NONE_ATTACHED) : null,
    });
  }

  states.push(
    {
      key: "game",
      label: "Game",
      value: p.game_id == null ? null : (opts.gameLabel ?? p.game_label ?? p.game_id),
      red: gameRed,
      note: gameRed ? gameNote : null,
    },
    {
      key: "market",
      label: "Market",
      value: p.stat_name ?? p.market,
      red: marketRed,
      note: marketRed
        ? `Parsed as "${p.market ?? p.stat_name ?? ""}", which the grader does not know`
        : null,
    },
    {
      key: "line",
      label: "Line",
      value: p.line == null ? (review ? "Not stated" : null) : String(p.line),
      red: lineRed,
      note: lineRed ? NO_NUMBER : noLine ?? (lineUnknown ? "Markets unavailable" : null),
    },
  );

  const odds = signedOdds(p.odds_taken);
  states.push(
    {
      key: "odds",
      label: "Odds",
      value: odds,
      red: false,
      note: odds === null ? "Not stated" : null,
    },
    {
      key: "stake",
      label: "Stake",
      value: p.units == null ? null : `${p.units}u`,
      red: false,
      note: p.units == null ? "Not stated" : null,
    },
  );

  return states;
}

export function primaryLabel(
  states: FieldState[],
  dirty: boolean,
): { label: "Save and regrade" | "Regrade"; enabled: boolean; remaining: number } {
  const remaining = states.filter((s) => s.red && !s.fixed).length;
  return { label: dirty ? "Save and regrade" : "Regrade", enabled: remaining === 0, remaining };
}

/** Field states as the detail pane shows them: session fixes applied and a
 * changed sport forcing a market recheck. The action strip reads the same list. */
export function effectiveStates(
  p: AuditProblem & { game_label?: string | null },
  markets: MarketDef[] | null,
  fixedKeys: FieldKey[],
  marketRecheck: string | null,
  opts: StateOpts = {},
): FieldState[] {
  return fieldStates(p, markets, opts).map((s): FieldState => {
    if (s.key === "market" && marketRecheck) {
      return { ...s, red: true, fixed: false, note: `Check for ${marketRecheck}` };
    }
    // The note explained the red state; a data note ("Not stated") stays.
    return fixedKeys.includes(s.key) ? { ...s, red: false, fixed: true, note: s.red ? null : s.note } : s;
  });
}
