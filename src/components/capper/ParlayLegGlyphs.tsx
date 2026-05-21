import type { HistoryPickLeg } from "@/lib/types";

const GLYPH_CONTENT: Record<string, string> = {
  W: "✓",        // check
  L: "✗",        // cross
  P: "–",        // en dash
  pending: "",        // empty tile with dashed outline
};

const GLYPH_CLASS: Record<string, string> = {
  W: "bg-[rgba(72,213,151,0.15)] text-[var(--color-pos)]",
  L: "bg-[rgba(255,90,90,0.18)] text-[var(--color-neg)]",
  P: "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-muted)] font-bold",
  pending: "bg-[rgba(255,255,255,0.04)] border border-dashed border-[rgba(255,255,255,0.22)]",
};

export function ParlayLegGlyphs({ legs }: { legs?: HistoryPickLeg[] }) {
  if (!legs || legs.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-[3px] align-middle">
      {legs.map((leg) => {
        const key = leg.outcome ?? "pending";
        const content = GLYPH_CONTENT[key] ?? "";
        const cls = GLYPH_CLASS[key] ?? GLYPH_CLASS.pending;
        return (
          <span
            key={leg.leg_index}
            data-testid="parlay-leg-glyph"
            data-outcome={key}
            title={leg.selection ?? undefined}
            className={`inline-flex w-[15px] h-[15px] rounded-[3px] items-center justify-center text-[10px] leading-none ${cls}`}
          >
            {content}
          </span>
        );
      })}
    </span>
  );
}
