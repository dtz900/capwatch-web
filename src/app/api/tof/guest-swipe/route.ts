/**
 * Tail or Fade guest-swipe telemetry.
 *
 * A signed-out visitor's swipes live in localStorage until they sign in, so
 * without this route an empty tof_plays cannot tell "nobody came" from
 * "people swiped and the sign-in wall ate them". One row per browser per
 * card; the browser id is generated client-side and means nothing on its own.
 * Shared dealt cards only: a guest has no follows, so no stable card.
 *
 * Unauthenticated by necessity: the visitor has no account yet. Everything
 * that protects the table is here or in the schema (fks to a real hand and
 * card, unique per browser per card, RLS on with no policy so only this route's service-role client can write). The client
 * calls it fire-and-forget, so the response body is never read: keep it
 * cheap and never leak why something was rejected.
 */
import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { parseGuestSwipe } from "@/lib/tof/guest-swipe";
import { kvRateLimit } from "@/lib/kv-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// A full deck is a handful of cards; a real visitor cannot exceed this by
// playing. It only exists to keep a loop from filling the table.
const LIMIT_PER_IP = 120;
const WINDOW_SEC = 600;

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const input = parseGuestSwipe(body);
  if (!input) return NextResponse.json({ ok: false }, { status: 400 });

  if (!(await kvRateLimit(`tof-guest:${clientIp(request)}`, LIMIT_PER_IP, WINDOW_SEC))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const supabase = createServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  // A refresh or a double-fired request must not inflate the count: the
  // unique (anon_id, card_id) makes the repeat a no-op instead of a row.
  const { error } = await supabase
    .from("tof_guest_swipes")
    .upsert(input, { onConflict: "anon_id,card_id", ignoreDuplicates: true });

  if (error) {
    // A stale tab pointing at a deleted hand or card lands here (fk violation)
    // and is not worth a log line; anything else is.
    if (error.code !== "23503") {
      console.error("tof: guest swipe insert failed", error.code, error.message);
    }
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
