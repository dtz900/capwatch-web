/**
 * A faint league wash behind the whole page: blue when MLB is selected, red
 * for NFL, nothing on the combined view. Fixed and non-interactive, painted
 * between the page background and the content (negative z-index against
 * the root canvas), so nothing else on the page has to know about it.
 */
const WASH: Record<"mlb" | "nfl", string> = {
  mlb:
    "radial-gradient(1400px 720px at 50% -12%, rgba(37, 99, 235, 0.26), rgba(37, 99, 235, 0) 62%)," +
    " linear-gradient(180deg, rgba(30, 64, 175, 0.10) 0%, rgba(30, 64, 175, 0) 42%)",
  nfl:
    "radial-gradient(1400px 720px at 50% -12%, rgba(220, 38, 38, 0.24), rgba(220, 38, 38, 0) 62%)," +
    " linear-gradient(180deg, rgba(153, 27, 27, 0.10) 0%, rgba(153, 27, 27, 0) 42%)",
};

export function SportTint({ sport }: { sport: string | null | undefined }) {
  const key = sport === "mlb" || sport === "nfl" ? sport : null;
  if (!key) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-500"
      style={{ background: WASH[key] }}
    />
  );
}
