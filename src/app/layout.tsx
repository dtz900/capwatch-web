import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { BrandFooter } from "@/components/nav/BrandFooter";
import { MobileTabBar } from "@/components/nav/MobileTabBar";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

const ROOT_TITLE = `MLB Twitter Capper Rankings · ${SITE_NAME}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: ROOT_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  applicationName: SITE_NAME,
  keywords: [
    "MLB picks",
    "verified cappers",
    "capper leaderboard",
    "sports betting Twitter",
    "graded picks",
    "MLB betting record",
    "TailSlips",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: ROOT_TITLE,
    description:
      "Every public MLB pick from a tracked Twitter capper, parsed within seconds and graded against the final game outcome.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: ROOT_TITLE,
    description:
      "Verified MLB picks. Every public capper, parsed and graded against final outcomes.",
    site: "@FadeAI_",
    creator: "@FadeAI_",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        {children}
        <BrandFooter />
        <MobileTabBar />
        <Analytics />
      </body>
    </html>
  );
}
