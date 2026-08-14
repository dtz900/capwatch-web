import type { SlateCapperSummary } from "@/lib/types";

/* Handles anonymized in SNAPSHOT renders of the slate standings
 * (/slate?snapshot=1), the view screenshotted for @tailslips posts. This is
 * a CONTENT decision, not a record decision: the public site shows every
 * capper plainly, ranks and units in the snapshot stay true, only the
 * identity (avatar, handle, link, streak) is withheld in the image so the
 * capper is never featured in our posts. Anyone clicking through from the
 * post sees the full board. There is no request-based opt-out; this list is
 * editorial discretion (see EA repo
 * projects/tailslips/incidents/2026-08-winwhenhot/). */
const CONTENT_ANON_HANDLES = new Set(["winwhenhot"]);

function anonymizeRow(row: SlateCapperSummary): SlateCapperSummary {
  if (!row.handle || !CONTENT_ANON_HANDLES.has(row.handle.toLowerCase())) {
    return row;
  }
  return {
    ...row,
    // Null identity renders the existing anonymous fallbacks: "??" avatar
    // initials, an em-dash name, no profile link, no streak badge. Rank,
    // record, and units are untouched so the board stays mathematically true.
    handle: null,
    display_name: null,
    profile_image_url: null,
    current_day_streak: null,
  };
}

/** Apply snapshot anonymization to a standings row set. */
export function anonymizeStandings(
  rows: SlateCapperSummary[] | null | undefined,
): SlateCapperSummary[] {
  return (rows ?? []).map(anonymizeRow);
}
