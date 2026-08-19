// Scraper shim for /slate. Card crawlers cap how much HTML they ingest
// (Twitterbot ~2MB) and the real slate page ships ~3.6MB, which killed card
// creation outright. Middleware rewrites scraper user agents here: identical
// metadata (re-exported from the real page, so the two can never drift) over
// a near-empty body. Humans never see this route; the visible URL stays
// /slate.
export { generateMetadata } from "../../slate/page";

export default function SlateScrapeShim() {
  return (
    <main>
      <h1>Tonight&apos;s MLB slate on TailSlips</h1>
      <p>
        <a href="/slate">View the full slate at tailslips.com/slate</a>
      </p>
    </main>
  );
}
