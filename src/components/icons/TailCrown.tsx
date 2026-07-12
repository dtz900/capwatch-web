/* The actual TailSlips crown (trend-arrow crown), vector-traced from the
 * brand asset. Outline at rest; `filled` fades the fill in, which is the
 * tail button's state indicator. Color comes from currentColor so hosts
 * steer it (black on the solid button, brand green once tailing). */
const CROWN_PATH =
  "M11.9 4.5L12.4 4.7L14.6 8.5L14.8 9.7L14.1 10.4L13.7 10.4L12.0 7.4L7.7 14.8L4.4 12.5L5.8 16.6L5.6 17.5L4.6 18.2L1.5 8.5L2.4 8.8L3.2 9.7L7.2 12.5L11.9 4.5ZM20.4 4.5L20.8 4.5L20.8 5.3L20.2 8.8L19.8 8.8L19.0 7.9L12.1 16.7L11.6 16.4L10.4 14.8L6.7 19.5L5.1 19.4L5.5 18.5L10.2 12.4L10.6 12.4L12.1 14.1L17.6 7.2L17.6 6.8L16.5 6.1L16.5 5.8L16.9 5.9L17.0 5.6L18.3 5.4L20.4 4.5ZM22.3 8.4L22.5 8.5L22.4 9.5L19.1 19.4L7.8 19.4L8.8 17.9L17.8 17.9L19.6 12.5L16.6 14.8L16.2 14.7L15.6 13.1L16.3 12.3L16.9 12.5L22.3 8.4Z";

export function TailCrown({
  filled,
  size = 15,
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
      aria-hidden="true"
      className={className}
    >
      <path
        d={CROWN_PATH}
        fillRule="evenodd"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        style={{ fillOpacity: filled ? 1 : 0, transition: "fill-opacity 200ms ease" }}
      />
    </svg>
  );
}
