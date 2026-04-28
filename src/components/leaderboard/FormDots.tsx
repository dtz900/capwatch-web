import type { FormOutcome } from "@/lib/types";

interface Props {
  outcomes: FormOutcome[];
  className?: string;
  "data-testid"?: string;
}

export function FormDots({ outcomes, className = "", ...rest }: Props) {
  return (
    <div className={`inline-flex gap-1 ${className}`} data-testid={rest["data-testid"]}>
      {outcomes.map((o, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${
            o === "W" ? "bg-[var(--color-pos)]" :
            o === "L" ? "bg-[var(--color-neg)]" :
                        "bg-[var(--color-text-muted)]"
          }`}
        />
      ))}
    </div>
  );
}
