import { API_BASE } from "@/lib/config";
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
      {books.map((b) => {
        const href = `${API_BASE}/r/${b.book_key}/${targetType}/${targetId}`;
        const label = contextLabel
          ? `Tail on ${b.display_name}: ${contextLabel}`
          : `Tail on ${b.display_name}`;
        return (
          <a
            key={b.book_key}
            href={href}
            target="_blank"
            rel="sponsored noopener noreferrer"
            aria-label={label}
            title={label}
            className="inline-flex items-center justify-center text-[10px] font-extrabold uppercase
                       tracking-[0.10em] px-2 py-1 rounded text-white shrink-0
                       transition-opacity hover:opacity-85"
            style={{ backgroundColor: b.brand_color }}
          >
            {b.display_name}
          </a>
        );
      })}
    </div>
  );
}
