/**
 * A faint league wash behind the whole page: blue when MLB is selected, red
 * for NFL, yellow for NBA (orange read as the NFL red on opening night,
 * David 2026-10-20), nothing on the combined view. The Tail or Fade bar sits
 * over the first ~300px, so the wash reaches well below it (David 2026-10-20:
 * "extend it down further for all screens"). Fixed and non-interactive, painted
 * between the page background and the content (negative z-index against
 * the root canvas), so nothing else on the page has to know about it.
 */
const WASH: Record<"mlb" | "nfl" | "nba", string> = {
  mlb:
    "radial-gradient(1600px 1150px at 50% 0%, rgba(37, 99, 235, 0.26), rgba(37, 99, 235, 0) 70%)," +
    " linear-gradient(180deg, rgba(30, 64, 175, 0.10) 0%, rgba(30, 64, 175, 0) 75%)",
  nfl:
    "radial-gradient(1600px 1150px at 50% 0%, rgba(220, 38, 38, 0.24), rgba(220, 38, 38, 0) 70%)," +
    " linear-gradient(180deg, rgba(153, 27, 27, 0.10) 0%, rgba(153, 27, 27, 0) 75%)",
  nba:
    "radial-gradient(1600px 1150px at 50% 0%, rgba(234, 179, 8, 0.22), rgba(234, 179, 8, 0) 70%)," +
    " linear-gradient(180deg, rgba(161, 98, 7, 0.10) 0%, rgba(161, 98, 7, 0) 75%)",
};

export function SportTint({ sport }: { sport: string | null | undefined }) {
  const key = sport === "mlb" || sport === "nfl" || sport === "nba" ? sport : null;
  if (!key) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-500"
      style={{ background: WASH[key] }}
    />
  );
}
