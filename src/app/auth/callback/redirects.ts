/* Where a sign-in or identity-link failure lands. The return cookie names the
   page the user left (set by the sign-in buttons and linkX); without it, or
   with anything that is not a same-origin path, the login page shows the
   error instead. */
export function errorRedirectTarget(origin: string, rawCookie: string | undefined, message: string): string {
  let dest = "/login";
  if (rawCookie) {
    const decoded = decodeURIComponent(rawCookie);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) dest = decoded;
  }
  const sep = dest.includes("?") ? "&" : "?";
  return `${origin}${dest}${sep}error=${encodeURIComponent(message)}`;
}
