export function SignalsIcon({
  size = 12,
  className,
  glow = false,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      style={
        glow
          ? {
              filter:
                "drop-shadow(0 0 3px rgba(94,234,212,0.55)) drop-shadow(0 0 1px rgba(94,234,212,0.7))",
            }
          : undefined
      }
    >
      <rect x="3" y="13" width="4" height="8" rx="1" />
      <rect x="10" y="8" width="4" height="13" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}
