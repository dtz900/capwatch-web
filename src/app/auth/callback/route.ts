import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";

const RETURN_COOKIE = "ts_return_to";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }
  const jar = await cookies();
  const raw = jar.get(RETURN_COOKIE)?.value;
  let dest = "/";
  if (raw) {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) dest = decoded;
    jar.delete(RETURN_COOKIE);
  }
  return NextResponse.redirect(`${origin}${dest}`);
}
