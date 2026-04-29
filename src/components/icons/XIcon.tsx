export function XIcon({
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
                "drop-shadow(0 0 3px rgba(255,255,255,0.5)) drop-shadow(0 0 1px rgba(120,180,255,0.6))",
            }
          : undefined
      }
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
