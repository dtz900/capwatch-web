export function vipEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VIP_ENABLED === "true";
}
