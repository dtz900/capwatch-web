"use client";
import { EmailPrefToggle } from "@/components/account/EmailPrefToggle";

/* Tail alerts opt-out (ts_profiles.email_tail_alerts). */
export function EmailAlertsToggle() {
  return (
    <EmailPrefToggle
      column="email_tail_alerts"
      title="Email me when my tails post picks"
      subtitle="One email per burst of new picks, with the full day board included."
      ariaLabel="Toggle tail email alerts"
    />
  );
}
