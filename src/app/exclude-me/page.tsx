import { ExcludeMeClient } from "./ExcludeMeClient";

export const metadata = {
  title: "Exclude Me",
  description: "Toggle analytics exclusion (Vercel and PostHog) for this browser.",
  robots: { index: false, follow: false },
};

export default function ExcludeMePage() {
  return <ExcludeMeClient />;
}
