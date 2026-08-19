// Scraper shim for capper profiles. See scrape/slate/page.tsx for the why:
// card crawlers cap ingested HTML, so scraper user agents get the identical
// metadata (re-exported from the real page) over a near-empty body.
export { generateMetadata } from "../../../cappers/[handle]/page";

export default async function CapperScrapeShim({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return (
    <main>
      <h1>@{handle} on TailSlips</h1>
      <p>
        <a href={`/cappers/${handle}`}>View the full verified record at tailslips.com</a>
      </p>
    </main>
  );
}
