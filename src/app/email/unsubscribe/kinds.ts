/* Which preference a one-click unsubscribe link flips. The platform signs
   the link (core/email_unsub.py build_unsub_url) and appends `k=tof` for the
   daily hand email; no `k` means the original tail alerts. */
export interface UnsubKind {
  column: "email_tail_alerts" | "email_tof_deals";
  heading: string;
  done: string;
}

export function unsubKind(k: string | undefined): UnsubKind {
  if (k === "tof") {
    return { column: "email_tof_deals", heading: "Deal emails", done: "You are unsubscribed from the daily hand email." };
  }
  return { column: "email_tail_alerts", heading: "Tail alerts", done: "You are unsubscribed from tail alerts." };
}
