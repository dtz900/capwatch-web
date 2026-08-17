import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";

const RETURN_COOKIE = "ts_return_to";

/**
 * Magic-link landing. Exchanges the PKCE code for a session, then sends the
 * user back where they started.
 *
 * Every failure path used to fall through to a bare redirect to "/", so a
 * user whose exchange failed saw a logged-out homepage with no explanation
 * (Inferno, 2026-08-16/17: "tried both; no go", three flow_state rows and
 * zero sign-ins). The common cause is PKCE's verifier cookie: it lives in
 * the browser that REQUESTED the link, so opening the email link in a
 * different browser, an in-app webview, or after a mail scanner pre-fetched
 * it makes Supabase answer flow_state_not_found. That is not a bug the user
 * can diagnose from a silent bounce, so failures now land on /login with a
 * specific message and the option to request a fresh link from this browser.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  const providerErrorDesc = searchParams.get("error_description");

  // Supabase can redirect here with an error instead of a code (expired or
  // already-used link). Surface it.
  if (providerError && !code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(providerErrorDesc || providerError)}`,
    );
  }

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // flow_state_not_found / verifier missing: the link was opened in a
      // browser other than the one that requested it. Say so.
      const verifierMiss =
        /flow.?state|code.?verifier|pkce/i.test(error.message) ||
        (error as { code?: string }).code === "flow_state_not_found";
      const msg = verifierMiss
        ? "That sign-in link has to be opened in the same browser you requested it from. Enter your email here and open the new link right here."
        : `Sign-in failed: ${error.message}`;
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
    }
  } else {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That sign-in link is missing its code. Request a new one.")}`,
    );
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
