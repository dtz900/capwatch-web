/* Hand-drawn marker oval, like someone circled the control on the screen:
 * wobbly ellipse whose ends overshoot without connecting. Stretches to its
 * host via preserveAspectRatio="none" (absolute-position it with an inset);
 * non-scaling stroke keeps the marker weight constant. Draws itself on
 * mount via the sharpie-draw keyframe. */
export function SharpieCircle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden="true"
      fill="none"
      className={`pointer-events-none absolute ${className}`}
    >
      <path
        d="M78 5 C96 8 103 17 97 27 C89 38 56 43 30 38 C10 34 -1 26 3 17 C7 7 30 1 56 2 C66 2.4 75 3.5 84 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        strokeDasharray="1"
        className="sharpie-draw"
      />
    </svg>
  );
}
