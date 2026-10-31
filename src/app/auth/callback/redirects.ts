/* Where a failure lands. `linkReturnCookie` is the identity-link return path
   (ts_link_return, written by linkX only); without it, or with anything that
   is not a same-origin path, the login page shows the error. Sign-in failures
   never pass a cookie here, so they always land on /login. */
export function errorRedirectTarget(origin: string, linkReturnCookie: string | undefined, message: string): string {
  let dest = "/login";
  if (linkReturnCookie) {
    const decoded = decodeURIComponent(linkReturnCookie);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) dest = decoded;
  }
  const sep = dest.includes("?") ? "&" : "?";
  return `${origin}${dest}${sep}error=${encodeURIComponent(message)}`;
}

/* Where a sign-in by emailed code lands: the path the sign-in button saved in
   ts_return_to (the same cookie /auth/callback honors for the magic link), or
   /my-tails. Only a same-origin path is trusted. */
export function signInReturnPath(cookieHeader: string): string {
  const raw = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("ts_return_to="))
    ?.slice("ts_return_to=".length);
  if (!raw) return "/my-tails";
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return "/my-tails";
  }
  // Browsers read "/\" like "//" (another host), so a backslash never passes.
  return decoded.startsWith("/") && !decoded.startsWith("//") && !decoded.includes("\\")
    ? decoded
    : "/my-tails";
}
