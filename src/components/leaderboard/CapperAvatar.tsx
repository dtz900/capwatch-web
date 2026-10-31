import Image from "next/image";
import { Titan_One } from "next/font/google";
import { capperVipEnabled } from "@/lib/flags";

// Closest cleanly-licensed match to GTA's Pricedown for the DELETED stamp.
// Self-hosted by next/font at build time; no runtime font request.
const stampFont = Titan_One({ weight: "400", subsets: ["latin"] });

interface Props {
  url: string | null;
  handle: string | null;
  size?: number;
  className?: string;
  apiIntegrated?: boolean;
  /** Capper deleted their whole X account. Dims the avatar and stamps an
   * angled DELETED band over it (GTA-wasted style), scaled to `size`. */
  accountDeleted?: boolean;
  /** Eligible to sell VIP in any sport: the purple ring, on every surface the
   * avatar appears (David, 2026-10-31). Dark until the Capper VIP launch flag. */
  vipEligible?: boolean;
}

/** Same ring the profile hero wears; tighter offset below 32px so stacked
 *  slate chips and 26px rows don't bleed into their neighbours. */
export function vipRingClass(size: number): string {
  const offset = size >= 32 ? "ring-offset-2" : "ring-offset-1";
  const glow = size >= 32 ? "shadow-[0_0_18px_rgba(109,40,217,0.45)]" : "shadow-[0_0_10px_rgba(109,40,217,0.45)]";
  return `ring-2 ring-[var(--color-vip)] ${offset} ring-offset-[var(--color-bg)] ${glow}`;
}

/** The same ring as a box-shadow list, for the fadeai_ gradient avatar whose
 *  inline blue glow would otherwise override the Tailwind ring classes. */
export function vipRingShadow(size: number): string {
  const offset = size >= 32 ? 2 : 1;
  const glow = size >= 32 ? "0 0 18px rgba(109,40,217,0.45)" : "0 0 10px rgba(109,40,217,0.45)";
  return `0 0 0 ${offset}px var(--color-bg), 0 0 0 ${offset + 2}px var(--color-vip), ${glow}`;
}

export function CapperAvatar({
  url,
  handle,
  size = 48,
  className = "",
  apiIntegrated = false,
  accountDeleted = false,
  vipEligible = false,
}: Props) {
  const initials = (handle ?? "??").replace(/^@/, "").slice(0, 2).toUpperCase();
  const vip = vipEligible && capperVipEnabled();

  let avatar: React.ReactNode;
  if (apiIntegrated) {
    const innerSize = size - 4;
    avatar = (
      <div
        className={`relative rounded-full flex items-center justify-center shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          background:
            "linear-gradient(135deg, #60a5fa 0%, #2563eb 50%, #1e40af 100%)",
          padding: 2,
          boxShadow: `${vip ? `${vipRingShadow(size)}, ` : ""}0 0 12px rgba(37, 99, 235, 0.45), 0 0 28px rgba(29, 78, 216, 0.18)`,
        }}
      >
        <div
          className="rounded-full overflow-hidden bg-[#2a2a2e] flex items-center justify-center"
          style={{ width: innerSize, height: innerSize }}
        >
          {url ? (
            <Image src={url} alt={initials} width={innerSize} height={innerSize} />
          ) : (
            <span
              className="text-[var(--color-text)] font-bold"
              style={{ fontSize: innerSize * 0.35 }}
            >
              {initials}
            </span>
          )}
        </div>
      </div>
    );
  } else {
    const wrap = `relative rounded-full overflow-hidden border border-[rgba(255,255,255,0.10)] bg-[#2a2a2e] flex items-center justify-center shrink-0 ${className} ${vip ? vipRingClass(size) : ""}`;
    const dim = { width: size, height: size };
    avatar = (
      <div className={wrap} style={dim}>
        {url ? (
          <Image src={url} alt={initials} width={size} height={size} />
        ) : (
          <span
            className="text-[var(--color-text)] font-bold"
            style={{ fontSize: size * 0.35 }}
          >
            {initials}
          </span>
        )}
      </div>
    );
  }

  if (!accountDeleted) return avatar;

  // GTA-wasted style stamp: chunky lowercase letters with a black outline
  // (like the "wasted" patch), oversized so it spills past the avatar
  // edges. Scales with `size` from 32px search rows to the 72px hero.
  const stampSize = Math.max(11, Math.round(size * 0.31));
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      title="This X account has been deleted. The graded record stands."
    >
      <div className="opacity-50 grayscale">{avatar}</div>
      <span
        className={`${stampFont.className} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12
                   whitespace-nowrap uppercase
                   pointer-events-none select-none z-10`}
        style={{
          fontSize: stampSize,
          letterSpacing: "0.01em",
          color: "#d21f2b",
          WebkitTextStroke: `${Math.max(1, Math.round(stampSize / 12))}px #000`,
          paintOrder: "stroke fill",
          textShadow: "0 0 8px rgba(0,0,0,0.85), 0 2px 2px rgba(0,0,0,0.7)",
        }}
      >
        deleted
      </span>
    </div>
  );
}
