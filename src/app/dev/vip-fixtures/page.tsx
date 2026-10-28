// Run: NEXT_PUBLIC_VIP_ENABLED=true NEXT_PUBLIC_CAPPER_VIP_ENABLED=true NEXT_PUBLIC_VIP_FIXTURES=true npm run dev then /dev/vip-fixtures
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VipFixtures } from "./VipFixtures";

/* Design sign-off aid: every Capper VIP surface from hard-coded payloads.
 * The page is a server shell only so it can 404 and carry noindex; the
 * scenarios render client side in VipFixtures. */
export const metadata: Metadata = {
  title: "VIP fixtures | TailSlips",
  robots: { index: false, follow: false },
};

export default function VipFixturesPage() {
  if (process.env.NEXT_PUBLIC_VIP_FIXTURES !== "true") notFound();
  return <VipFixtures />;
}
