import { stripPlayerName } from "./slate-players";

const MAX_LEN = 24;

/**
 * Short NBA bet label with the player's name removed: "Cade Cunningham TO
 * SCORE 20+ POINTS" -> "20+ PTS". Parser output is free text, so common
 * stat spellings fold into one compact form.
 */
export function nbaBetLabel(selection: string | null | undefined, playerName: string): string | null {
  if (!selection) return null;
  const s = stripPlayerName(selection, playerName)
    .replace(/^player\s+/i, "")
    .replace(/^to\s+(score|record)\s+/i, "")
    .replace(/\b(pts|points)\s*\+\s*(reb|rebounds)\s*\+\s*(ast|assists)\b/gi, "PRA")
    .replace(/\b(rebs?|rebounds)\s*\+\s*(asts?|assists)\b/gi, "RA")
    .replace(/\bstl\s*\+\s*blk\b/gi, "STL+BLK")
    .replace(/\b(made\s+threes|3pm|threes)\b/gi, "3PM")
    .replace(/\bpoints\b/gi, "PTS")
    .replace(/\brebounds\b/gi, "REB")
    .replace(/\bassists\b/gi, "AST")
    .replace(/\bblocks\b/gi, "BLK")
    .replace(/\bsteals\b/gi, "STL")
    .replace(/\bin\s+each\s+quarter\b/gi, "EACH QTR")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    // Over/under lines read better as a lowercase o/u prefix ("o8.5 REB").
    .replace(/\b(OVER|UNDER|O|U)\s*(?=\d)/g, (m) => m[0].toLowerCase());
  return s ? s.slice(0, MAX_LEN) : null;
}
