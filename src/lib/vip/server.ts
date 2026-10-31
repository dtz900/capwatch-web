import { API_BASE } from "@/lib/config";
import type { VipCapperStatus } from "./types";

/** Anonymous VIP status for the profile's first paint (ring, crown, card).
 *  Sent with no token on purpose: the response is the same for every viewer,
 *  so it is safe to cache. Viewer-specific parts (subscribed, unlocked picks)
 *  still come from the browser's own call. Null on any failure: the client
 *  fetch then fills the section as before. */
export async function fetchPublicVipStatus(capperId: number): Promise<VipCapperStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/api/vip/cappers/${capperId}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      if (res.status !== 404) console.error(`VIP first-paint status ${res.status} for capper ${capperId}`);
      return null;
    }
    return (await res.json()) as VipCapperStatus;
  } catch (err) {
    console.error("VIP first-paint status failed", err);
    return null;
  }
}
