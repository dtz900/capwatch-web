import { renderPalaceOg, size, alt, contentType } from "./_pp-og-renderer";

export const runtime = "nodejs";
export { size, alt, contentType };

export default async function Image(
  { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderPalaceOg(slug);
}
