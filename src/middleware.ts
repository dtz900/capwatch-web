import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Basic-auth gate for /admin/* routes. Credentials live in env vars
// ADMIN_USER / ADMIN_PASS on the server. Browser prompts on first hit;
// header is then cached for the session.
export async function middleware(req: NextRequest) {
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
