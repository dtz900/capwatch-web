"use client";

import type { RejectedPickShaped } from "@/lib/api";

interface Props {
  items: RejectedPickShaped[];
  onBack: () => void;
}

const MUTED = "text-[var(--color-text-muted)]";
const isHttps = (u: string | null): u is string => !!u && u.startsWith("https://");

export function ResidueList({ items, onBack }: Props) {
  return (
    <div>
      <button
        type="button"
        onClick={(e) => {
          e.currentTarget.blur();
          onBack();
        }}
        className="w-full text-left px-[22px] py-[11px] border-b border-[var(--color-border)] text-[12px] font-bold text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
      >
        ‹ Back to queue
      </button>
      <div className={`px-[22px] pt-3 pb-2 text-[10.5px] font-extrabold tracking-[0.14em] uppercase ${MUTED}`}>
        Pick-shaped rejects, 7 days
      </div>
      {items.length === 0 ? (
        <div className={`px-[22px] py-6 text-[12px] font-semibold ${MUTED}`}>Nothing here.</div>
      ) : (
        items.map((it) => (
          <div key={it.extraction_id} className="px-[22px] py-[10px] border-b border-[var(--color-border)]">
            <div className="text-[12px] font-extrabold text-[var(--color-text-soft)]">
              {it.capper_handle ? `@${it.capper_handle}` : "Unknown capper"}
            </div>
            <div className="mt-1 text-[12.5px] font-semibold line-clamp-2">{it.tweet_excerpt}</div>
            <div className={`mt-1 flex items-center gap-3 text-[11.5px] font-semibold ${MUTED}`}>
              <span className="min-w-0 truncate">{it.rejection_reason ?? "No reason recorded"}</span>
              {isHttps(it.tweet_url) && (
                <a
                  href={it.tweet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex-none font-bold text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
                >
                  Open on X
                </a>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
