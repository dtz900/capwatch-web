import type { CapperProfile, CapperRow } from "./types";
import { SITE_NAME, SITE_TAGLINE, SITE_URL, canonicalUrl, formatRecord, roiToReviewRating } from "./seo";

interface JsonLdNode {
  "@context"?: string;
  "@type": string | string[];
  [key: string]: unknown;
}

export function organizationNode(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-favicon.png`,
    description: SITE_TAGLINE,
    sameAs: ["https://twitter.com/FadeAI_"],
  };
}

export function websiteNode(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_TAGLINE,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

export function breadcrumbNode(items: { name: string; path: string }[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}

export function leaderboardItemListNode(rows: CapperRow[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${SITE_NAME} verified capper leaderboard`,
    description: "Top tracked MLB Twitter cappers ranked by units profit on graded picks.",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: rows.length,
    itemListElement: rows.slice(0, 10).map((row, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: row.handle ? canonicalUrl(`/cappers/${row.handle}`) : undefined,
      name: row.display_name ?? row.handle ?? "Unknown",
    })),
  };
}

export function capperPersonNode(profile: CapperProfile): JsonLdNode {
  const c = profile.capper;
  const handle = c.handle ?? "";
  const url = canonicalUrl(`/cappers/${handle}`);
  const sameAs = handle ? [`https://twitter.com/${handle}`] : [];
  const node: JsonLdNode = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}#person`,
    name: c.display_name ?? `@${handle}`,
    alternateName: handle ? `@${handle}` : undefined,
    url,
    sameAs,
    description: `Tracked MLB sports betting account on ${SITE_NAME}.`,
  };
  if (c.profile_image_url) node.image = c.profile_image_url;
  return node;
}

export function capperReviewNode(profile: CapperProfile): JsonLdNode | null {
  const allTime = profile.aggregates["all_time"];
  if (!allTime || allTime.picks_count === 0) return null;

  const handle = profile.capper.handle ?? "";
  const url = canonicalUrl(`/cappers/${handle}`);
  const ratingValue = roiToReviewRating(allTime.roi_pct);
  const record = formatRecord(allTime);
  const units = allTime.units_profit >= 0
    ? `+${allTime.units_profit.toFixed(1)}u`
    : `${allTime.units_profit.toFixed(1)}u`;
  const roi = `${allTime.roi_pct >= 0 ? "+" : ""}${allTime.roi_pct.toFixed(1)}%`;

  return {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "Person",
      "@id": `${url}#person`,
      name: profile.capper.display_name ?? `@${handle}`,
      url,
    },
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue,
      bestRating: 5,
      worstRating: 1,
    },
    name: `Verified record for @${handle}`,
    reviewBody: `${record} (${units}, ${roi} ROI) across ${allTime.picks_count} graded MLB picks on ${SITE_NAME}. Every public pick is parsed within seconds of posting and graded against the final game outcome at the odds and stake the capper actually posted.`,
    datePublished: allTime.refreshed_at ?? new Date().toISOString(),
  };
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export function faqNode(entries: FaqEntry[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.question,
      acceptedAnswer: { "@type": "Answer", text: e.answer },
    })),
  };
}

export function methodologyArticleNode(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${SITE_NAME} grading methodology`,
    description:
      "Rules every tracked account on the leaderboard is graded by, and what does and does not count as a verifiable pick.",
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo-favicon.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl("/methodology") },
  };
}
