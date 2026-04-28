import { PodiumCard } from "./PodiumCard";
import type { CapperRow } from "@/lib/types";

interface Props {
  rows: CapperRow[];
}

export function Podium({ rows }: Props) {
  if (rows.length < 3) return null;
  const [first, second, third] = rows;

  return (
    <section className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_1fr] gap-4 mb-9 items-start">
      <div className="md:order-1 order-2"><PodiumCard rank={2} variant="silver" capper={second} /></div>
      <div className="md:order-2 order-1"><PodiumCard rank={1} variant="gold"   capper={first}  /></div>
      <div className="md:order-3 order-3"><PodiumCard rank={3} variant="bronze" capper={third}  /></div>
    </section>
  );
}
