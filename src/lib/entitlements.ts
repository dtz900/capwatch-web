export interface Entitlements {
  isLoggedIn: boolean;
  isVip: boolean;
}

export function resolveEntitlements(
  session: { user: { id: string } } | null,
  profile: { tier: string } | null
): Entitlements {
  const isLoggedIn = !!session?.user?.id;
  return { isLoggedIn, isVip: isLoggedIn && profile?.tier === "vip" };
}
