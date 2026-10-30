import type { VipSubscription } from "./types";

/* Mirrors the platform's has_access: a canceled subscription keeps access
 * until the period it already paid for ends. */
export function hasVipAccess(sub: VipSubscription): boolean {
  if (sub.status === "active") return !sub.expired;
  return (
    sub.status === "canceled" && Boolean(sub.current_period_end) && !sub.expired
  );
}
