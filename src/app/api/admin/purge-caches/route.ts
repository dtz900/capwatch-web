/**
 * Admin cache purge. Wired to the Pipeline page's "Refresh Aggregates"
 * button so a fresh aggregate write surfaces on the public site without
 * waiting for the per-key KV TTL or the Next ISR window to expire.
 *
 * Scope: every cache layer that capper / leaderboard / slate reads from.
 *   - Upstash KV: delete keys matching `lb:`, `profile:`, `slate:` prefixes.
 *   - Next.js ISR: revalidate the affected page paths.
 *
 * Gated by the same CRON_SECRET bearer the rest of /api/admin uses.
 */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { purgeKvByPrefix } from "@/lib/kv-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!expected || !bearer || bearer !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Allow callers to scope the purge by passing ?scope=profile|leaderboard|slate.
  // Default scope is "all" which clears every cache the admin cares about.
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") || "all";

  const prefixes: string[] = [];
  if (scope === "all" || scope === "profile") prefixes.push("profile:");
  if (scope === "all" || scope === "leaderboard") prefixes.push("lb:");
  if (scope === "all" || scope === "slate") prefixes.push("slate:");

  const purged: Record<string, number> = {};
  for (const p of prefixes) {
    purged[p] = await purgeKvByPrefix(p);
  }

  // ISR revalidation. Page paths that derive from the purged data.
  const revalidated: string[] = [];
  try {
    if (scope === "all" || scope === "profile") {
      revalidatePath("/cappers/[handle]", "page");
      revalidatePath("/cappers");
      revalidated.push("/cappers/[handle]", "/cappers");
    }
    if (scope === "all" || scope === "leaderboard") {
      revalidatePath("/leaderboard");
      revalidatePath("/");
      revalidated.push("/leaderboard", "/");
    }
    if (scope === "all" || scope === "slate") {
      revalidatePath("/slate");
      revalidated.push("/slate");
    }
  } catch {
    // revalidatePath swallows errors in production but throws during build;
    // we don't want a 500 to mask the KV portion of the work either way.
  }

  return NextResponse.json({ ok: true, scope, purged, revalidated });
}
