import { NextRequest, NextResponse } from "next/server";

// Basic-auth gate for /admin/* routes. Credentials live in env vars
// ADMIN_USER / ADMIN_PASS on the server. Browser prompts on first hit;
// header is then cached for the session.
export function middleware(req: NextRequest) {
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
    headers: { "WWW-Authenticate": 'Basic realm="Capwatch Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
