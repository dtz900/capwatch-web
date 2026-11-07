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

/** Unknown market list or no match: assume a line is needed. */
function takesLine(p: AuditProblem, markets: MarketDef[] | null): boolean {
  if (!markets) return true;
  const name = p.stat_name ?? p.market;
  const hit = markets.find((m) => m.stat_name === name);
  return hit ? hit.takes_line : true;
}

export interface StateOpts {
  /** Readable label for the bound game (teams and date). */
  gameLabel?: string | null;
  /** Markets failed to load: whether the pick takes a line is unknown, so it cannot be red. */
  marketsError?: boolean;
}

export function fieldStates(
  p: AuditProblem & { game_label?: string | null },
  markets: MarketDef[] | null,
  opts: StateOpts = {},
): FieldState[] {
  const gameRed =
    p.reason === "missing_game_id" || p.reason === "player_did_not_play" || p.game_id == null;
  const gameNote = p.reason === "player_did_not_play" ? NEXT_DAY : NOT_BOUND;

  const playerRed =
    p.reason === "missing_player_id" || (p.bet_kind === "player" && p.player_id == null);
  const marketRed = p.reason === "market_unhandled";
  const lineUnknown = !!opts.marketsError && p.line == null;
  const lineRed = p.reason === "missing_line" || (p.line == null && !opts.marketsError && takesLine(p, markets));

  const states: FieldState[] = [];

  if (!isNcaab(p)) {
    states.push({
      key: "player",
      label: "Player",
      value: p.player_name ?? (p.player_id != null ? `id ${p.player_id}` : null),
      red: playerRed,
      note: playerRed ? NONE_ATTACHED : null,
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
      value: p.line == null ? null : String(p.line),
      red: lineRed,
      note: lineRed ? NO_NUMBER : lineUnknown ? "Markets unavailable" : null,
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
    return fixedKeys.includes(s.key) ? { ...s, red: false, fixed: true } : s;
  });
}
