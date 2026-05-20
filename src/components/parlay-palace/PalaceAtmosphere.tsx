// Atmospheric page treatment for /parlay-palace and /parlay-palace/[slug].
// Three layers, all CSS-only and pointer-events:none:
//   1. Warm gold radial backdrop anchored at the top of the viewport.
//   2. ~22 gold motes drifting slowly upward. Honors prefers-reduced-motion.
//   3. (Header shimmer + card glint live on their respective components.)
//
// Renders as `fixed inset-0` behind the page content via -z-10. Because
// it's mounted on the parlay-palace routes only, navigation away from
// the section unmounts the atmosphere and other pages are unaffected.
import "./palace-atmosphere.css";

const MOTE_COUNT = 22;

function _seed(i: number, salt: number): number {
  // Deterministic pseudo-random so SSR + client render match without a
  // useEffect dance. Mulberry-32-ish, plenty of variation for 22 motes.
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function PalaceAtmosphere() {
  const motes = Array.from({ length: MOTE_COUNT }, (_, i) => {
    const left = _seed(i, 1) * 100;
    const size = 2 + _seed(i, 2) * 3;     // 2 – 5 px
    const dur = 18 + _seed(i, 3) * 18;    // 18 – 36 s
    const delay = -1 * _seed(i, 4) * dur; // negative so they're mid-flight on load
    const drift = (_seed(i, 5) - 0.5) * 80; // -40 to +40 px sideways
    const op = 0.30 + _seed(i, 6) * 0.45;  // 0.30 – 0.75 (visible against #0a0a0c)
    return { left, size, dur, delay, drift, op, key: i };
  });

  return (
    <>
      {/* z-0 on the atmosphere + relative z-10 on `main` keeps the
          interactive content on top. Negative z-index (-z-10) sits
          BEHIND the body's solid bg color and renders invisibly, which
          was the original bug. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[78vh] z-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 65% at 50% -8%, rgba(202,164,90,0.28) 0%, rgba(202,164,90,0.14) 22%, rgba(202,164,90,0.04) 50%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="palace-motes pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        {motes.map((m) => (
          <span
            key={m.key}
            className="palace-mote"
            style={{
              left: `${m.left}%`,
              width: `${m.size}px`,
              height: `${m.size}px`,
              ["--mote-dur" as string]: `${m.dur}s`,
              ["--mote-delay" as string]: `${m.delay}s`,
              ["--mote-drift" as string]: `${m.drift}px`,
              ["--mote-op" as string]: m.op,
            }}
          />
        ))}
      </div>
    </>
  );
}
