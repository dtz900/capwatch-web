import { renderAwardOg, size, alt, contentType } from "./_award-og-renderer";

export const runtime = "nodejs";
export { size, alt, contentType };

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderAwardOg(slug);
}
