import { ExcludeMeClient } from "./ExcludeMeClient";

export const metadata = {
  title: "Exclude Me",
  description: "Toggle Vercel Analytics exclusion for this browser.",
  robots: { index: false, follow: false },
};

export default function ExcludeMePage() {
  return <ExcludeMeClient />;
}
