import type { LastPick } from "@/lib/types";

export const FORM_TICKS = 6;

/** Last graded picks as ticks, oldest to newest, the newest a touch taller.
 *  Same reading as the podium's momentum strip, at row size. */
export function FormTicks({ picks, n = FORM_TICKS }: { picks: LastPick[]; n?: number }) {
  const recent = (picks ?? []).slice(0, n);
  if (recent.length === 0) return null;
  const segments = [...recent].reverse();
  const title = `Last ${segments.length} graded, oldest to newest: ${segments.map((p) => p.outcome).join(" ")}`;
  return (
    <div className="flex items-center gap-[3px]" title={title} aria-label={title} role="img">
      {segments.map((p, i) => {
        const color =
          p.outcome === "W" ? "bg-[var(--color-pos)]" :
          p.outcome === "L" ? "bg-[var(--color-neg)]" :
                              "bg-[rgba(255,255,255,0.16)]";
        const last = i === segments.length - 1;
        return <span key={i} className={`block w-[9px] rounded-[2px] ${color} ${last ? "h-[7px]" : "h-[5px]"}`} />;
      })}
    </div>
  );
}
