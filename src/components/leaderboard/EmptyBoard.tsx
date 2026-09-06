import type { SportFilter } from "@/lib/types";

type Window = "last_7" | "last_30" | "season" | "all_time";

const WINDOW_LABEL: Record<Window, string> = {
  last_7: "the last 7 days",
  last_30: "the last 30 days",
  season: "this season",
  all_time: "all time",
};

/**
 * The board has no ranked cappers for this sport + window. Two honest
 * reasons: the sport has not settled a graded pick yet (NFL before Week 1;
 * preseason is tracked but never counted), or nobody clears the window's
 * minimum. Say which, instead of rendering a blank page.
 */
export function EmptyBoard({ sport, window }: { sport: SportFilter; window: Window }) {
  const nfl = sport === "nfl";
  return (
    <section
      data-testid="empty-board"
      className="my-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center"
    >
      <h2 className="text-[20px] font-extrabold tracking-[-0.015em] mb-2">
        {nfl ? "No graded NFL picks yet" : "No cappers on the board"}
      </h2>
      <p className="mx-auto max-w-lg text-[13px] leading-relaxed text-[var(--color-text-muted)]">
        {nfl
          ? "Week 1 picks are captured and graded as the games settle. Preseason picks are tracked but never count toward a record."
          : `Nobody clears the minimum graded picks for ${WINDOW_LABEL[window] ?? "this window"}. Try a wider window.`}
      </p>
    </section>
  );
}
