export { formatOdds } from "../audit/labels";

export const REVIEW_REASON_LABEL: Record<string, string> = {
  nba_player_unresolved: "Player not found at final",
  nba_player_not_in_boxscore: "Player not in the box score",
  nba_prop_scope_unsupported: "Period prop, hand-grade",
  nfl_player_ambiguous: "Player name matches two rosters",
  player_not_on_nfl_roster: "Player not on an NFL roster",
  priced_team_rescue: "Rescued: priced team line",
  recap_before_start_rescue: "Rescued: recap before start",
  pick_shaped_rescue: "Rescued: pick-shaped",
  ownership_rescue: "Rescued: ownership",
  "guard_quarantine:board_grid_not_a_pick": "Looks like a board grid",
  some_legs_started_some_pregame_per_pick: "Parlay: one leg had started",
  nba_unbound_posted_after_last_tip: "Posted after the last tip",
  nba_city_or_college: "City or college team?",
  ncaab_late_post_unverified: "Posted near tip, start unverified",
  drifted_repost_parlay: "Repost of an earlier parlay",
  thread_component_straight: "Thread copy of a parlay leg",
  ambiguous_surname_wrong_game: "Surname matched the wrong game",
  policy_quarantine: "Capper policy recheck",
  none: "No reason recorded",
  parser_hold: "Held by the parser",
};

const NO_REASON = "No reason recorded";

/** Human label for a hold reason. `soft` means "nothing recorded", shown muted rather than red. */
export function reasonLabel(reason: string | null): { text: string; soft: boolean } {
  const r = (reason ?? "").trim();
  if (!r || r === "none") return { text: NO_REASON, soft: true };
  const known = REVIEW_REASON_LABEL[r];
  if (known) return { text: known, soft: false };
  const colon = r.indexOf(":");
  const text =
    colon === -1
      ? r.replace(/_/g, " ")
      : r.slice(0, colon).replace(/_/g, " ") + r.slice(colon);
  return { text, soft: false };
}

/** Split tweet text into lines and mark the first one that carries the pick. */
export function markTweetLine(
  text: string,
  selection: string | null,
): { line: string; marked: boolean }[] {
  const lines = text.split("\n");
  const key = (selection ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).join(" ").toLowerCase();
  let found = false;
  return lines.map((line) => {
    if (!found && key && line.toLowerCase().includes(key)) {
      found = true;
      return { line, marked: true };
    }
    return { line, marked: false };
  });
}
