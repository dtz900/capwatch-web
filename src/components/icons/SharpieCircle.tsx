/* Hand-drawn marker oval (real marker texture, exported from the brand
 * files) circling the tail control. The PNG is used as a CSS mask and
 * painted with currentColor, so hosts recolor it like any icon while the
 * grain survives. Absolute-position it with an inset; it stretches to fit. */
const MASK: React.CSSProperties = {
  WebkitMaskImage: "url(/sharpie-oval.png)",
  maskImage: "url(/sharpie-oval.png)",
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  backgroundColor: "currentColor",
};

export function SharpieCircle({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={MASK}
      className={`pointer-events-none absolute sharpie-in ${className}`}
    />
  );
}
