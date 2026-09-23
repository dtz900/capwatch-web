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
