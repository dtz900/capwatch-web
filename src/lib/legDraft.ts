// Pure leg-draft helpers shared by the admin manual-entry panel
// (src/app/admin/audit/AddBetPanel.tsx) and the capper VIP composer
// (src/components/vip/LegEditor.tsx). Structural types only, so this module
// imports from neither the admin server actions nor the VIP client.

export type LegType = "ml" | "spread" | "total" | "team_runs" | "nrfi" | "player" | "custom";

/** The fields a leg reads off a game search result (admin or VIP). */
export interface LegGameShape {
  game_pk: number | string;
  away_team: string | null;
  home_team: string | null;
  game_number?: number | null;
}

/** The fields a leg reads off a player search result (admin only). */
export interface LegPlayerShape {
  player_id: number;
  full_name: string;
}

export interface LegDraft {
  type: LegType;
  selection: string;
  game: LegGameShape | null;
  odds: string;
  line: string;
  direction: "over" | "under" | "";
  statName: string;
  player: LegPlayerShape | null;
}

/** Same fields as the admin ManualLegInput and the VIP ManualLegInput. */
export interface LegInputShape {
  selection: string;
  game_id?: string | null;
  stat_name?: string | null;
  market?: string | null;
  direction?: string | null;
  line?: number | null;
  odds?: number | null;
  player_id?: number | null;
  player_name?: string | null;
}

export const EMPTY_LEG: LegDraft = {
  type: "ml",
  selection: "",
  game: null,
  odds: "",
  line: "",
  direction: "",
  statName: "",
  player: null,
};

export const LEG_TYPE_LABEL: Record<LegType, string> = {
  ml: "Moneyline",
  spread: "Run line",
  total: "Total",
  team_runs: "Team total",
  nrfi: "NRFI/YRFI",
  player: "Player prop",
  custom: "Custom",
};

/** `sport` picks the team-total stat: MLB grades `team_runs`, NFL and NBA
 *  grade `team_points` (the platform 400s unknown_stat_name otherwise).
 *  Defaults to MLB so the admin panel is unchanged. */
export function legToInput(leg: LegDraft, sport: string = "MLB"): LegInputShape {
  const line = leg.line.trim() === "" ? null : Number(leg.line);
  const odds = leg.odds.trim() === "" ? null : Number(leg.odds);
  const base: LegInputShape = {
    selection: leg.selection.trim(),
    game_id: leg.game ? String(leg.game.game_pk) : null,
    odds,
  };
  switch (leg.type) {
    case "ml":
      return { ...base, stat_name: "win" };
    case "spread":
      return { ...base, stat_name: "spread", line };
    case "total":
      return { ...base, stat_name: "total", direction: leg.direction || null, line };
    case "team_runs":
      return {
        ...base,
        stat_name: sport.toUpperCase() === "MLB" ? "team_runs" : "team_points",
        direction: leg.direction || null,
        line,
      };
    case "nrfi":
      return { ...base, stat_name: "nrfi", direction: leg.direction || "under", line: 0.5 };
    case "player":
      return {
        ...base,
        stat_name: leg.statName.trim() || null,
        direction: leg.direction || null,
        line,
        player_id: leg.player?.player_id ?? null,
        player_name: leg.player?.full_name ?? null,
      };
    case "custom":
      return { ...base, stat_name: leg.statName.trim() || null, direction: leg.direction || null, line };
  }
}

/** American odds text: empty -> null, a finite integer -> that number, else "invalid". */
export function parseOddsField(s: string): number | null | "invalid" {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && Number.isInteger(n) ? n : "invalid";
}

/** Line text: empty -> null, a finite number -> that number, else "invalid". */
export function parseLineField(s: string): number | null | "invalid" {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : "invalid";
}

/** Today's date in Eastern as YYYY-MM-DD (the slate date the game pickers default to). */
export function todayEt(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}
