/* Stripe returns land on a profile with ?vip=<outcome>. Read it once, then
 * drop it so Back or a reload never replays it. */

/** Drop ?vip= from the address bar. */
export function stripVipParam(params: URLSearchParams) {
  params.delete("vip");
  const qs = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
}
