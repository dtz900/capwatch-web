import { teamDisplayName } from "@/lib/team-names";
import { dateLabel } from "./editors/dates";
import { sideSelection } from "./sideSelection";

/** The teams of a game, as an editor learned them. Ids only exist for NCAAB. */
export interface GameTeams {
  away_team: string | null;
  home_team: string | null;
  away_team_id?: string | number | null;
  home_team_id?: string | number | null;
}

// First token of the market tail (ML, spreads, over/under, period splits).
const MARKET_TAIL = /^(ml$|moneyline|[+-]?\d|[ou]\d|[ou]$|over|under|rl$|f5|1h|tt\b)/i;

/** "D. Acuff o4.5 Rebs" gives "D. Acuff"; "Lakers ML" gives "Lakers". */
export function leadingToken(selection: string | null | undefined): string {
  const tokens = (selection ?? "").trim().split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < tokens.length && !MARKET_TAIL.test(tokens[i])) i++;
  return tokens.slice(0, i).join(" ");
}

/** Lower-case, no dots, no generational suffix: "Darius Acuff Jr." is "darius acuff". */
export function nameKey(name: string | null | undefined): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+(jr|sr|ii|iii|iv)$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface Subject {
  player_name?: string | null;
  selection: string | null;
}

/** The names a pick can be recognised by: its player and the leading selection token. */
function subjectKeys(r: Subject): Set<string> {
  return new Set([nameKey(r.player_name), nameKey(leadingToken(r.selection))].filter(Boolean));
}

export function sameSubject(a: Subject, b: Subject): boolean {
  const mine = subjectKeys(a);
  for (const k of subjectKeys(b)) if (mine.has(k)) return true;
  return false;
}

/** True when the token names one of the game's teams (code, display name,
 * its last word such as "Kings", or an NCAAB team id). */
export function tokenOnGame(token: string, game: GameTeams, sport: string | null | undefined): boolean {
  const t = token.trim().toLowerCase();
  if (!t) return false;
  const ncaab = (sport ?? "").toUpperCase() === "NCAAB";
  const sides: Array<[string | null, string | number | null | undefined]> = [
    [game.away_team, game.away_team_id],
    [game.home_team, game.home_team_id],
  ];
  for (const [code, id] of sides) {
    if (code && code.toLowerCase() === t) return true;
    if (ncaab && id != null && String(id).toLowerCase() === t) return true;
    if (!code) continue;
    const name = teamDisplayName(code, sport).toLowerCase();
    if (name === t || name.split(" ").pop() === t) return true;
    if (ncaab && name.startsWith(`${t} `)) return true;
  }
  return false;
}

/** The side row is only worth showing for a team pick whose team the game cannot resolve. */
export function sideRowVisible(
  p: { bet_kind?: string | null; selection: string | null; reason: string; sport?: string | null },
  game: GameTeams | null,
): boolean {
  if (p.bet_kind === "player") return false;
  if (!game || !game.away_team || !game.home_team) return false;
  if (sideSelection(p.selection, game.away_team) === sideSelection(p.selection, game.home_team)) return false;
  if (p.reason === "ungradeable") return true;
  return !tokenOnGame(leadingToken(p.selection), game, p.sport);
}

/** "San Antonio Spurs @ Sacramento Kings · Fri, Nov 6". */
export function gameLabelFor(game: GameTeams, sport: string | null | undefined, ymd: string | null): string {
  const teams = `${teamDisplayName(game.away_team, sport)} @ ${teamDisplayName(game.home_team, sport)}`;
  return ymd ? `${teams} · ${dateLabel(ymd)}` : teams;
}
