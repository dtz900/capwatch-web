import Image from "next/image";

interface Props {
  url: string | null;
  handle: string | null;
  size?: number;
  className?: string;
}

export function CapperAvatar({ url, handle, size = 48, className = "" }: Props) {
  const initials = (handle ?? "??").replace(/^@/, "").slice(0, 2).toUpperCase();
  const wrap = `relative rounded-full overflow-hidden border border-[rgba(255,255,255,0.10)] bg-[#2a2a2e] flex items-center justify-center ${className}`;
  const dim = { width: size, height: size };

  if (!url) {
    return (
      <div className={wrap} style={dim}>
        <span className="text-[var(--color-text)] font-bold" style={{ fontSize: size * 0.35 }}>
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
