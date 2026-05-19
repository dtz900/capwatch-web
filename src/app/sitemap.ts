import type { MetadataRoute } from "next";
import { fetchLeaderboard, fetchPalaceList } from "@/lib/api";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,              lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${SITE_URL}/cappers`,       lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${SITE_URL}/slate`,         lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${SITE_URL}/parlay-palace`, lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${SITE_URL}/methodology`,   lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  let capperEntries: MetadataRoute.Sitemap = [];
  try {
    const data = await fetchLeaderboard({
      window: "all_time",
      sort: "units_profit",
      bet_type: "all",
      min_picks: 0,
      active_only: false,
    });
    capperEntries = data.leaderboard
      .filter((r) => r.handle)
      .map((r) => ({
        url: `${SITE_URL}/cappers/${encodeURIComponent(r.handle as string)}`,
        lastModified: parseLastModified(r.tracked_since) ?? now,
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));
  } catch {
    // API down at build time. Static entries still ship; capper rows reappear
    // on the next regeneration once the API is reachable.
  }

  let palaceEntries: MetadataRoute.Sitemap = [];
  try {
    const list = await fetchPalaceList();
    palaceEntries = list.map((e) => ({
      url: `${SITE_URL}/parlay-palace/${encodeURIComponent(e.slug)}`,
      lastModified: e.published_at ? new Date(e.published_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // API down at build time. Ship without palace entries; reappear next regen.
  }

  return [...staticEntries, ...capperEntries, ...palaceEntries];
}

function parseLastModified(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
