import type { ActivityStatus } from "@/lib/types";

const STYLES: Record<ActivityStatus, string> = {
  active:  "bg-[rgba(25,245,124,0.10)] text-[var(--color-pos)]",
  quiet:   "bg-[rgba(251,191,36,0.10)] text-[#fbbf24]",
  dormant: "bg-[rgba(249,115,22,0.10)] text-[#fb923c]",
  dark:    "bg-[rgba(115,115,115,0.20)] text-[#a1a1aa]",
};
const LABELS: Record<ActivityStatus, string> = {
  active: "Active", quiet: "Quiet", dormant: "Dormant", dark: "Dark",
};

export function StatusPill({ status }: { status: ActivityStatus }) {
  return (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-px rounded
                      uppercase tracking-[0.06em] ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
