import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Basic-auth gate for /admin/* routes. Credentials live in env vars
// ADMIN_USER / ADMIN_PASS on the server. Browser prompts on first hit;
// header is then cached for the session.
export async function middleware(req: NextRequest) {
  // Social-scraper visibility: Vercel's request logs don't carry the user
  // agent, so when a card mysteriously fails to attach there is no way to
  // tell whether the platform's crawler ever reached us. One log line per
  // scraper hit makes "did Twitterbot fetch, and what did it get" a grep.
  const ua = req.headers.get("user-agent") ?? "";
  const isScraper =
    /twitterbot|facebookexternalhit|slackbot|discordbot|linkedinbot|telegrambot|whatsapp/i.test(ua);
  if (isScraper) {
    console.log(
      `[scrape] ${req.method} ${req.nextUrl.pathname}${req.nextUrl.search} ua="${ua.slice(0, 100)}"`,
    );
  }

  // Card crawlers cap how much HTML they ingest (Twitterbot ~2MB) and the
  // full slate page ships ~3.6MB, so the crawler downloads, hits its cap,
  // discards, and never fetches the og:image: no card, ever (2026-08-18
  // ATL-MIN incident: 10+ Twitterbot HTML fetches, zero image fetches).
  // Rewrite scraper hits on shareable pages to /scrape shims that emit the
  // identical metadata over a near-empty body. The visible URL never
  // changes; humans never see the shim.
  if (
    isScraper &&
    (req.nextUrl.pathname === "/slate" ||
      (req.nextUrl.pathname.startsWith("/cappers/") && !req.nextUrl.pathname.includes("/og")))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = `/scrape${req.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  if (req.nextUrl.pathname.startsWith("/admin")) {
    const user = process.env.ADMIN_USER;
    const pass = process.env.ADMIN_PASS;
    if (!user || !pass) {
      return new NextResponse("Admin auth not configured", { status: 503 });
    }

    const auth = req.headers.get("authorization");
    if (auth) {
      const [scheme, encoded] = auth.split(" ", 2);
      if (scheme === "Basic" && encoded) {
        try {
          const decoded = atob(encoded);
          const sep = decoded.indexOf(":");
          if (sep >= 0) {
            const u = decoded.slice(0, sep);
            const p = decoded.slice(sep + 1);
            if (u === user && p === pass) {
              return NextResponse.next();
            }
          }
        } catch {
          // fallthrough
        }
      }
    }

    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="TailSlips Admin"' },
    });
  }

  if (
    process.env.NEXT_PUBLIC_VIP_ENABLED === "true" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    let response = NextResponse.next({ request: req });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value }) =>
              req.cookies.set(name, value)
            );
            response = NextResponse.next({ request: req });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );
    await supabase.auth.getUser(); // refreshes the session cookie when expiring
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)).*)",
  ],
};
