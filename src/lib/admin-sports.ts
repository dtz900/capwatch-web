/** Sports the admin audit tools understand. Admin-only: the public `Sport`
 * type in types.ts is intentionally left alone. */
export const ADMIN_SPORTS = ["MLB", "NFL", "NBA", "NCAAB"] as const;
export type AdminSport = (typeof ADMIN_SPORTS)[number];

export function parseAdminSport(raw: unknown): AdminSport | undefined {
  if (typeof raw !== "string") return undefined;
  const up = raw.trim().toUpperCase();
  return (ADMIN_SPORTS as readonly string[]).includes(up) ? (up as AdminSport) : undefined;
}
