import { NextRequest, NextResponse } from "next/server";

import { applyUnsub } from "@/app/email/unsubscribe/apply";

export const dynamic = "force-dynamic";

/* RFC 8058 one-click unsubscribe. The platform puts this URL in the
 * List-Unsubscribe header (core/email_unsub.py unsub_headers) with
 * `List-Unsubscribe-Post: List-Unsubscribe=One-Click`; Gmail and Yahoo POST
 * here when someone presses their built-in Unsubscribe button. No cookies
 * or session: the signed token in the query string is the authorization,
 * the same one the footer link carries. The POST body is ignored. */
export async function POST(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const result = await applyUnsub(q.get("u") ?? "", q.get("t") ?? "", q.get("k") ?? undefined);
  if (result === "ok") return NextResponse.json({ ok: true });
  if (result === "invalid") {
    return NextResponse.json({ ok: false, error: "Invalid unsubscribe link." }, { status: 400 });
  }
  // 5xx so the mailbox provider retries instead of assuming it worked.
  return NextResponse.json({ ok: false, error: "Could not unsubscribe. Try again." }, { status: 500 });
}

/* A person who opens the header URL in a browser gets the normal page. */
export function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/email/unsubscribe";
  return NextResponse.redirect(url, 303);
}
