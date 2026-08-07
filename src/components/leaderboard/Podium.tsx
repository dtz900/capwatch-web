import { PodiumCard } from "./PodiumCard";
import type { CapperRow, Window } from "@/lib/types";

interface Props {
  rows: CapperRow[];
  window?: Window;
}

export function Podium({ rows, window }: Props) {
  if (rows.length < 3) return null;
  const [first, second, third] = rows;

  // Two things keep the podium honest across widths:
  //
  // 1. min-w-0 on each cell. Grid items default to min-width:auto, so a card's
  //    intrinsic content width (long display name + pills + streak badge)
  //    overrode the fr ratio -- the leader rendered NARROWER than the #2 card
  //    (387px vs 436px at 1440, worse as the viewport tightened) and the three
  //    cards summed past the viewport below ~1180px. With it the tracks are a
  //    true 1 : 1.4 : 1 at every width.
  //
  // 2. lg (1024px), not md (768px), for the three-column switch. At 768 the
  //    side cards computed to 200px: names truncated to a few characters, the
  //    tagline collapsed to "M.", the MOMENTUM label collided with its
  //    OLDEST -> NEWEST caption, and the sparkline bled past the card edge.
  //    Stacked full-width cards read far better through that range.
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_1fr] gap-4 mb-9 items-stretch">
      <div className="lg:order-1 order-2 lg:mt-8 min-w-0"><PodiumCard rank={2} variant="silver" capper={second} window={window} /></div>
      <div className="lg:order-2 order-1 min-w-0"><PodiumCard rank={1} variant="gold"   capper={first}  window={window} /></div>
      <div className="lg:order-3 order-3 lg:mt-12 min-w-0"><PodiumCard rank={3} variant="bronze" capper={third}  window={window} /></div>
    </section>
  );
}
