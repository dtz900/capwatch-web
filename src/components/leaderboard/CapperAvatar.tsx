import Image from "next/image";

interface Props {
  url: string | null;
  handle: string | null;
  size?: number;
  className?: string;
  apiIntegrated?: boolean;
}

export function CapperAvatar({
  url,
  handle,
  size = 48,
  className = "",
  apiIntegrated = false,
}: Props) {
  const initials = (handle ?? "??").replace(/^@/, "").slice(0, 2).toUpperCase();

  if (apiIntegrated) {
    const innerSize = size - 4;
    return (
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
  }

  const wrap = `relative rounded-full overflow-hidden border border-[rgba(255,255,255,0.10)] bg-[#2a2a2e] flex items-center justify-center shrink-0 ${className}`;
  const dim = { width: size, height: size };

  if (!url) {
    return (
      <div className={wrap} style={dim}>
        <span
          className="text-[var(--color-text)] font-bold"
          style={{ fontSize: size * 0.35 }}
        >
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div className={wrap} style={dim}>
      <Image src={url} alt={initials} width={size} height={size} />
    </div>
  );
}
