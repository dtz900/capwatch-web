export const runtime = "nodejs";
// See opengraph-image.tsx: per-request render is deliberate post-no-store.
export const dynamic = "force-dynamic";

export {
  default,
  alt,
  size,
  contentType,
} from "./opengraph-image";
