import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { BrandFooter } from "@/components/nav/BrandFooter";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tailslips.com"),
  title: "MLB Twitter Capper Rankings · TailSlips",
  description:
    "Verified MLB picks from tracked Twitter cappers, parsed live and graded against final game outcomes.",
  openGraph: {
    title: "MLB Twitter Capper Rankings · TailSlips",
    description:
      "Every public MLB pick from a tracked Twitter capper, parsed within seconds and graded against the final game outcome.",
    url: "/",
    siteName: "TailSlips",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB Twitter Capper Rankings · TailSlips",
    description:
      "Verified MLB picks. Every public capper, parsed and graded against final outcomes.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        {children}
        <BrandFooter />
      </body>
    </html>
  );
}
