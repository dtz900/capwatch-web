import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://tailslips.com/",            priority: 1.0, changeFrequency: "daily" },
    { url: "https://tailslips.com/methodology", priority: 0.5, changeFrequency: "monthly" },
  ];
}
