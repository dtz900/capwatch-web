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
      {/* Background is white because BetMGM (and most sportsbook) CJ
          creatives are PNGs with alpha channels designed for light
          backgrounds — transparent regions on a dark site theme bleed
          through and the dark text becomes invisible. Giving the
          container the canvas color the artwork was designed for makes
          the creative render as intended without us having to host or
          color-correct anything ourselves. */}
      <a
        href={href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={creative.alt}
        className="inline-block leading-none rounded-md overflow-hidden border border-[rgba(255,255,255,0.06)]"
        style={{ maxWidth: "100%", background: "#ffffff" }}
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
          Sponsored · 21+ · Gambling problem? 1-800-GAMBLER
        </div>
      )}
    </div>
  );
}
