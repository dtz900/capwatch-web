/**
 * Stamps a browser's guest swipes with the account it eventually signed into.
 *
 * This is the number the whole table exists for: guests who swiped and then
 * made an account, versus guests who swiped and left. Called once by the hero
 * when the post-login replay runs.
 *
 * The account is taken from the caller's own session cookie, never from the
 * body, so a caller cannot stamp someone else's rows. The browser id comes
 * from the body but can only ever mark rows as converted, which is why an
 * unauthenticated caller gets nothing done here.
 */
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { isUuid } from "@/lib/tof/anon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const anonId = (body as { anon_id?: unknown } | null)?.anon_id;
  if (!isUuid(anonId)) return NextResponse.json({ ok: false }, { status: 400 });

  const session = await createServerSupabase();
  const { data: auth } = await session.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const supabase = createServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  // Only unstamped rows: the first account a browser signs into is the
  // conversion. A shared browser signing in as a second user later must not
  // rewrite the first one's attribution.
  const { error } = await supabase
    .from("tof_guest_swipes")
    .update({ converted_user_id: userId, converted_at: new Date().toISOString() })
    .eq("anon_id", anonId)
    .is("converted_user_id", null);

  if (error) {
    console.error("tof: guest conversion stamp failed", error.code, error.message);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
