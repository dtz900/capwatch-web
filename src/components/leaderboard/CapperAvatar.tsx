import Image from "next/image";

interface Props {
  url: string | null;
  handle: string | null;
  size?: number;
  className?: string;
  apiIntegrated?: boolean;
  /** Capper deleted their whole X account. Dims the avatar and stamps an
   * angled DELETED band over it (GTA-wasted style), scaled to `size`. */
  accountDeleted?: boolean;
}

export function CapperAvatar({
  url,
  handle,
  size = 48,
  className = "",
  apiIntegrated = false,
  accountDeleted = false,
}: Props) {
  const initials = (handle ?? "??").replace(/^@/, "").slice(0, 2).toUpperCase();

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
          boxShadow:
            "0 0 12px rgba(37, 99, 235, 0.45), 0 0 28px rgba(29, 78, 216, 0.18)",
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
    const wrap = `relative rounded-full overflow-hidden border border-[rgba(255,255,255,0.10)] bg-[#2a2a2e] flex items-center justify-center shrink-0 ${className}`;
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

  // GTA-wasted style band: oversized relative to the avatar so it spills
  // past the edges. Scales with `size` so it works from 40px list rows to
  // the 72px profile hero.
  const stampFont = Math.max(9, Math.round(size * 0.21));
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      title="This X account has been deleted. The graded record stands."
    >
      <div className="opacity-35 grayscale">{avatar}</div>
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12
                   whitespace-nowrap font-black uppercase
                   pointer-events-none select-none z-10"
        style={{
          fontSize: stampFont,
          letterSpacing: "0.16em",
          padding: `${Math.max(2, Math.round(size * 0.045))}px ${Math.max(6, Math.round(size * 0.17))}px`,
          color: "#d63c3c",
          background: "rgba(0,0,0,0.82)",
          textShadow: "0 1px 0 rgba(0,0,0,0.9)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.6)",
        }}
      >
        Deleted
      </span>
    </div>
  );
}
