"use client";
import { EmailPrefToggle } from "@/components/account/EmailPrefToggle";
import { capperVipEnabled } from "@/lib/flags";

/* VIP pick emails opt-out (ts_profiles.email_vip_picks). Hidden until
   Capper VIP launches. */
export function VipEmailToggle() {
  if (!capperVipEnabled()) return null;
  return (
    <EmailPrefToggle
      column="email_vip_picks"
      title="VIP pick emails"
      subtitle="One email per VIP pick from cappers you subscribe to."
      ariaLabel="Toggle VIP pick emails"
    />
  );
}
