import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://capwatch.fadeai.bet/",            priority: 1.0, changeFrequency: "daily" },
    { url: "https://capwatch.fadeai.bet/methodology", priority: 0.5, changeFrequency: "monthly" },
  ];
}
