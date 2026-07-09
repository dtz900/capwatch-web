import type { TodayPickEntry } from "@/lib/types";

const STATUS: Record<string, { label: string; cls: string }> = {
  W: { label: "WON", cls: "bg-[var(--color-pos)]/15 text-[var(--color-pos)] border-[var(--color-pos)]/40" },
  L: { label: "LOST", cls: "bg-[var(--color-neg)]/15 text-[var(--color-neg)] border-[var(--color-neg)]/40" },
  P: { label: "PUSH", cls: "text-[var(--color-text-muted)] border-[var(--color-border-h)]" },
  V: { label: "VOID", cls: "text-[var(--color-text-muted)] border-[var(--color-border-h)]" },
};

export function StatusPill({ outcome }: { outcome: TodayPickEntry["outcome"] }) {
  if (!outcome) {
    return (
      <span className="rounded-md border border-dashed border-[var(--color-border-h)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--color-text-soft)]">
        PENDING
      </span>
    );
  }
  const s = STATUS[outcome];
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider ${s.cls}`}>
      {s.label}
    </span>
  );
}
