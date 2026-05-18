import { sportsbookMeta } from "@/lib/sportsbooks";
import type { SportsbookSummary } from "@/lib/api";

/**
 * Responsible-gaming + sportsbook terms disclaimer.
 *
 * Affiliate program terms require the sportsbook's T&Cs to be present
 * and visible on site wherever the CTA renders, plus a responsible-
 * gaming disclaimer on all marketing materials. This component renders
 * exactly when affiliate CTAs are live (same books prop as
 * AffiliatePicker) and renders nothing when no book is enabled, so the
 * disclaimer can never appear without a live CTA or vice versa.
 *
 * Per-book T&Cs links come from SPORTSBOOK_META keyed by book_key.
 */
export function AffiliateDisclaimer({ books }: { books: SportsbookSummary[] }) {
  if (!books || books.length === 0) return null;

  const withTerms = books
    .map((b) => ({ name: b.display_name, url: sportsbookMeta(b.book_key)?.termsUrl }))
    .filter((b): b is { name: string; url: string } => !!b.url);

  return (
    <p className="mt-3 text-[10px] leading-relaxed text-[var(--color-text-muted)]">
      Must be 21+ and physically located in a state where the sportsbook
      operates. If you or someone you know has a gambling problem, call
      1-800-GAMBLER. TailSlips tracks publicly posted picks for research only;
      tailing any pick involves financial risk and is not betting advice.
      {withTerms.length > 0 && (
        <>
          {" "}
          {withTerms.map((b, i) => (
            <span key={b.url}>
              {i > 0 && " "}
              <a
                href={b.url}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="underline underline-offset-2 hover:text-[var(--color-text-soft)]"
              >
                {b.name} terms apply
              </a>
              .
            </span>
          ))}
        </>
      )}
    </p>
  );
}
