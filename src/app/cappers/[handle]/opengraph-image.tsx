import { renderCapperOg, size, alt, contentType } from "./_og-renderer";

export const runtime = "nodejs";
export { size, alt, contentType };

// The file-convention OG image route. Defaults to the all-time, all-bet-type
// view. Filter-aware shares route through `og/route.ts` instead.
export default async function CapperOgImage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return renderCapperOg(handle);
}
