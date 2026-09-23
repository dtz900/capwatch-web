/* Client side of tof_claim_x_identity() (migration 2026-09-23_tof_x_verification.sql).
   The function is idempotent and is the app's read of "am I verified", so it
   runs after every sign-in that carries a Twitter identity. */

export type ClaimResult =
  | { status: "no_identity" }
  | { status: "no_capper"; suggested_username: string | null; avatar_url: string | null }
  | { status: "claimed_by_other"; handle: string }
  | { status: "verified"; capper_id: number; handle: string; avatar_url: string | null; username_set: boolean };

export type ClaimStatus = ClaimResult["status"] | "idle";

interface IdentityLike {
  provider?: string;
}

export function hasTwitterIdentity(user: { identities?: IdentityLike[] | null } | null | undefined): boolean {
  return Boolean(user?.identities?.some((i) => i.provider === "twitter"));
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function parseClaimResult(data: unknown): ClaimResult | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  switch (d.status) {
    case "no_identity":
      return { status: "no_identity" };
    case "no_capper":
      return { status: "no_capper", suggested_username: str(d.suggested_username), avatar_url: str(d.avatar_url) };
    case "claimed_by_other": {
      const handle = str(d.handle);
      return handle ? { status: "claimed_by_other", handle } : null;
    }
    case "verified": {
      const handle = str(d.handle);
      if (!handle || typeof d.capper_id !== "number") return null;
      return { status: "verified", capper_id: d.capper_id, handle, avatar_url: str(d.avatar_url), username_set: d.username_set === true };
    }
    default:
      return null;
  }
}

/** Board and hero avatar: the tracked capper photo wins over an upload. */
export function displayAvatar(
  profile: { avatar_url: string | null } | null | undefined,
  capper: { avatar_url: string | null } | null | undefined,
): string | null {
  return capper?.avatar_url || profile?.avatar_url || null;
}
