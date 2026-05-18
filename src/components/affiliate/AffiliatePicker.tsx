"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/config";
import { sportsbookMeta } from "@/lib/sportsbooks";
import type { SportsbookSummary } from "@/lib/api";

type TargetType = "pick" | "parlay";

interface Props {
  books: SportsbookSummary[];
  targetType: TargetType;
  targetId: number;
  /** Optional accessible label suffix, e.g. capper handle or pick descriptor. */
  contextLabel?: string;
}

/**
 * Three-button cluster routing visitors to sportsbook affiliate URLs.
 *
 * Renders nothing if no books are enabled. The list of books is sourced
 * from /api/public/sportsbooks server-side and passed in as a prop, so
 * each row gets the same list without re-fetching.
 *
 * Each button hits the backend /r/{book}/{target_type}/{target_id}
 * endpoint, which logs the click and 302-redirects to the sportsbook
 * with the affiliate id appended.
 *
 * The button face uses the official CJ-provided logo (affiliate program
 * terms require their creative, not a homemade brand treatment). If the
 * asset is missing it falls back to the text + brand-color treatment so
 * the button never breaks before the official asset is dropped in.
 *
 * rel="sponsored" is the SEO-correct attribution for paid affiliate
 * links per Google's link-attribute guidance. Combined with
 * rel="noopener noreferrer" for the usual security reasons.
 */
export function AffiliatePicker({ books, targetType, targetId, contextLabel }: Props) {
  if (!books || books.length === 0) return null;

  return (
    <div
      className="inline-flex items-center gap-1"
      role="group"
      aria-label="Tail this pick at a sportsbook"
    >
      {books.map((b) => (
        <BookButton
          key={b.book_key}
          book={b}
          href={`${API_BASE}/r/${b.book_key}/${targetType}/${targetId}`}
          label={
            contextLabel
              ? `Tail on ${b.display_name}: ${contextLabel}`
              : `Tail on ${b.display_name}`
          }
        />
      ))}
    </div>
  );
}

function BookButton({
  book,
  href,
  label,
}: {
  book: SportsbookSummary;
  href: string;
  label: string;
}) {
  const meta = sportsbookMeta(book.book_key);
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = !!meta?.logo && !logoFailed;

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label={label}
      title={label}
      className={
        showLogo
          ? "inline-flex items-center justify-center shrink-0 rounded px-2 py-1 bg-white transition-opacity hover:opacity-85"
          : "inline-flex items-center justify-center text-[10px] font-extrabold uppercase tracking-[0.10em] px-2 py-1 rounded text-white shrink-0 transition-opacity hover:opacity-85"
      }
      style={showLogo ? undefined : { backgroundColor: book.brand_color }}
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta!.logo as string}
          alt={book.display_name}
          height={14}
          className="h-3.5 w-auto block"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        book.display_name
      )}
    </a>
  );
}
