import type { ReactNode } from "react";
import type { QueueRow } from "./labels";

const isHttps = (u: string | null | undefined): u is string => !!u && u.startsWith("https://");

export function TweetBlock({ p, renderText }: { p: QueueRow; renderText?: (text: string) => ReactNode }) {
  const media = (p.media_urls ?? []).filter(isHttps).slice(0, 4);
  return (
    <div className="mt-[18px] pl-4 py-3.5 border-l-2 border-[rgba(255,255,255,0.13)]">
      {p.tweet_text ? (
        <p className="text-[15.5px] font-semibold leading-[1.5] text-[var(--color-text)] whitespace-pre-wrap">
          {renderText ? renderText(p.tweet_text) : p.tweet_text}
        </p>
      ) : (
        <p className="text-[13px] font-semibold text-[var(--color-text-muted)]">No tweet text on this pick.</p>
      )}
      {isHttps(p.tweet_url) && (
        <div className="mt-2 text-[12px] font-semibold text-[var(--color-text-muted)]">
          The tweet, in full.{" "}
          <a
            href={p.tweet_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-extrabold text-[var(--color-text-soft)] underline"
          >
            Open on X
          </a>
        </div>
      )}
      {media.length > 0 && (
        <div className="flex gap-2 mt-3">
          {media.map((u) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="Tweet attachment" className="max-h-40 rounded-lg border border-[var(--color-border)]" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
