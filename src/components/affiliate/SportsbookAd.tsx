import { buildClickUrl, type SportsbookCreative } from "@/lib/affiliates";

interface Props {
  creative: SportsbookCreative;
  /**
   * Stable placement identifier reported to CJ via `?sid=`. Use kebab-case
   * slugs like "capper-inline" or "slate-header" so we can compare
   * conversion rate across surfaces in CJ's reporting UI.
   */
  placement: string;
  className?: string;
  /** Show the FTC + responsible-gambling disclosure under the banner. */
  showDisclosure?: boolean;
}

export function SportsbookAd({
  creative,
  placement,
  className,
  showDisclosure = true,
}: Props) {
  const href = buildClickUrl(creative, placement);
  return (
    <div className={className}>
      {/* Canvas + frame styling. The PNG creative has an alpha channel
          and was designed for light publishers, so we paint a warm
          off-white behind it (#f7f3e9 reads as cream, less harsh than
          pure white against the dark TailSlips theme) and ring it with
          a translucent gold border. The gold echoes BetMGM's own brand
          accents and bridges the brightness gap so the ad doesn't pop
          off the page like a flashbang. */}
      <a
        href={href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={creative.alt}
        className="inline-block leading-none rounded-md overflow-hidden border border-[rgba(245,197,74,0.45)] shadow-[0_0_24px_-12px_rgba(245,197,74,0.35)]"
        style={{ maxWidth: "100%", background: "#f7f3e9" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={creative.imageUrl}
          alt={creative.alt}
          width={creative.width}
          height={creative.height}
          loading="lazy"
          style={{ display: "block", maxWidth: "100%", height: "auto" }}
        />
      </a>
      {showDisclosure && (
        <div className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)] font-bold opacity-70">
          Sponsored · 21+ ·{" "}
          <a
            href="https://sports.betmgm.com/en/sports/terms-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-100"
          >
            Terms apply
          </a>
          {" "}· Gambling problem? Call 1-800-GAMBLER
        </div>
      )}
    </div>
  );
}
