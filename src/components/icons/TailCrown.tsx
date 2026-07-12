/* Simplified single-path take on the TailSlips crown (the right spike rises
 * into the logo's trend-arrow). Outline at rest; `filled` fades the fill in,
 * which is the tail button's state indicator. Color comes from currentColor
 * so hosts steer it (black on the solid button, brand green once tailing). */
export function TailCrown({
  filled,
  size = 14,
  className = "",
}: {
  filled: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3.5 18.5 V9 L8 12.5 L12 5 L15.5 11 L20.5 5.5 V18.5 Z"
        fill="currentColor"
        style={{ fillOpacity: filled ? 1 : 0, transition: "fill-opacity 200ms ease" }}
      />
      <path d="M16.5 4.5 L20.5 5.5 L19.8 9.5" fill="none" />
    </svg>
  );
}
