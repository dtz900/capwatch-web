import { renderSlateOg, size, alt, contentType } from "./_slate-og-renderer";

export const runtime = "nodejs";
export { size, alt, contentType };

// Next.js file-convention OG image for /slate. Pulls the live slate + season
// leaderboard and renders a marquee-game + top-sharps roster card.
export default async function SlateOgImage() {
  return renderSlateOg();
}
