import type { SlatePick } from "./types";

/**
 * Most-backed players on a game, for the NFL OG card.
 *
 * Props are 50-80% of every NFL game's picks (Week 2 2026: IND@KC 20 of 32,
 * MIN@CHI 24 of 33) and the moneyline split the MLB card leads with is the
 * least interesting slice of a football game. Individual prop LINES rarely
 * repeat (the best consensus in a game is 2-3 sharps on one line), so the
 * unit is the player: distinct sharps with any prop on him, the most common
 * bet as the lean.
 */

export interface BackedPlayer {
  playerId: number;
  name: string;
  /** Distinct cappers with a prop on the player. */
  sharps: number;
  /** Rows (straights + parlay legs). */
  legs: number;
  /** Named handles, first-seen order; suppressed handles counted, not listed. */
  handles: string[];
  /** Most common bet label, "x2" when repeated; null when no row parses. */
  lean: string | null;
}

// Mirrors the renderer's X_SUPPRESSED_HANDLES: counted, never named.
const SUPPRESSED = new Set(["winwhenhot"]);

type PlayerRow = Pick<SlatePick, "capper_id" | "handle" | "selection" | "player_id" | "player_name">;

interface Bucket {
  name: string;
  cappers: Set<number>;
  legs: number;
  handles: string[];
  labels: Map<string, { label: string; n: number }>;
}

export function topBackedPlayers(picks: readonly PlayerRow[], n = 3): BackedPlayer[] {
  const byPlayer = new Map<number, Bucket>();
  for (const p of picks) {
    if (p.player_id == null || !p.player_name) continue;
    let e = byPlayer.get(p.player_id);
    if (!e) {
      e = { name: p.player_name, cappers: new Set(), legs: 0, handles: [], labels: new Map() };
      byPlayer.set(p.player_id, e);
    }
    // Rows spell the same player differently ("P.Mahomes", "Patrick
    // Mahomes"); the longest form is the most complete one.
    if (p.player_name.length > e.name.length) e.name = p.player_name;
    e.legs += 1;
    const firstSeen = !e.cappers.has(p.capper_id);
    e.cappers.add(p.capper_id);
    if (firstSeen && p.handle && !SUPPRESSED.has(p.handle.toLowerCase())) e.handles.push(p.handle);
    const label = betLabel(p.selection, p.player_name);
    if (label) {
      const key = label.toLowerCase();
      const cur = e.labels.get(key);
      if (cur) cur.n += 1;
      else e.labels.set(key, { label, n: 1 });
    }
  }
  return [...byPlayer.entries()]
    .map(([playerId, e]) => {
      let top: { label: string; n: number } | null = null;
      for (const l of e.labels.values()) if (!top || l.n > top.n) top = l;
      return {
        playerId,
        name: e.name,
        sharps: e.cappers.size,
        legs: e.legs,
        handles: e.handles,
        lean: top ? (top.n > 1 ? `${top.label} x${top.n}` : top.label) : null,
      };
    })
    // Ties break on name so the card is stable between renders.
    .sort((a, b) => b.sharps - a.sharps || b.legs - a.legs || a.name.localeCompare(b.name))
    .slice(0, n);
}

const POSITION_TAGS = /^(QB|RB|WR|TE|K|DST|D\/ST)\b\s*/i;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The bet with the player's name removed: "Patrick Mahomes QB Under 224.5
 * Pass Yards" -> "Under 224.5 Pass Yards". Parser output is free text, so
 * this also folds the common spellings (u/o, Yds, Any Time Touchdown Scorer)
 * into one form so repeats count as one lean.
 */
export function betLabel(selection: string | null | undefined, playerName: string): string | null {
  if (!selection) return null;
  let s = selection.replace(/\s+/g, " ").trim();
  const parts = playerName.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.slice(1).join(" ");
  const full = escapeRe(playerName.trim());
  const shorthand = last ? `${escapeRe(first[0] ?? "")}\\.?\\s*${escapeRe(last)}` : null;
  const lastOnly = last ? escapeRe(last) : null;
  for (const pat of [full, shorthand, lastOnly]) {
    if (!pat) continue;
    const re = new RegExp(`^${pat}\\b[\\s:,-]*`, "i");
    if (re.test(s)) {
      s = s.replace(re, "");
      break;
    }
  }
  s = s.replace(POSITION_TAGS, "");
  s = s.replace(/^to (record|have|score)\s+/i, "");
  if (/any\s*time\s*(touchdown|td)/i.test(s)) return "Anytime TD";
  s = s
    .replace(/^u\s*(?=\d)/i, "Under ")
    .replace(/^o\s*(?=\d)/i, "Over ")
    .replace(/\b(pass|passing)\s+(yds?|yards)\b/gi, "Passing Yards")
    .replace(/\b(rec|receiving)\s+(yds?|yards)\b/gi, "Receiving Yards")
    .replace(/\b(rush|rushing)\s+(yds?|yards)\b/gi, "Rushing Yards")
    .replace(/\byds?\b/gi, "Yards")
    .replace(/\byards\b/gi, "Yards")
    .replace(/\brec\b/gi, "Rec")
    .replace(/\bunder\b/gi, "Under")
    .replace(/\bover\b/gi, "Over")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > 0 ? s : null;
}
