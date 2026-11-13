import { absoluteTweetUrl, SECOND_BET_SENTENCE, twinDifferences } from "@/lib/liveTwin";
import { formatOdds } from "./reviewLabels";
import type { ReviewRow } from "./reviewRow";

interface Props {
  p: ReviewRow;
  /** The Approve button's own rule: a pick with no game cannot be approved at all. */
  canApprove: boolean;
  pending: boolean;
  onApproveAnyway: (id: number) => void;
}

const BTN = "border rounded-md px-2.5 py-[3px] text-[11.5px] font-extrabold disabled:opacity-40";
const OK = `${BTN} border-[var(--color-border)] text-[var(--color-text-soft)] hover:text-[var(--color-text)]`;
const CELL = "py-[5px] text-[13px] font-bold tabular-nums";

/** Detail-pane block for a held pick the capper already has live. Renders nothing without a live twin. */
export function AlreadyLive({ p, canApprove, pending, onApproveAnyway }: Props) {
  const t = p.live_twin;
  if (!t) return null;
  const diff = twinDifferences(t, { odds: p.odds_taken, units: p.units });
  const link = absoluteTweetUrl(t.tweet_url);
  const rows = [diff.price && { label: "Price", ...diff.price }, diff.stake && { label: "Stake", ...diff.stake }].filter(
    (r): r is { label: string; mine: string; live: string } => !!r,
  );
  const who = p.capper_handle ? `@${p.capper_handle}` : "This capper";
  const differs = rows.length === 2 ? "price and stake differ" : rows[0]?.label === "Price" ? "price differs" : "stake differs";
  return (
    <section className="mt-5 border-t border-b border-[var(--color-border)] py-3">
      <div className="flex items-center gap-3">
        <div className="mr-auto text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[var(--color-neg)]">
          Already live
        </div>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11.5px] font-extrabold text-[var(--color-text-soft)] underline decoration-[rgba(255,255,255,0.13)] underline-offset-[3px] hover:text-[var(--color-text)]"
          >
            View the live pick&apos;s tweet
          </a>
        )}
      </div>
      <div className="mt-2 text-[13.5px] font-bold">
        {`${who} already has this pick live as #${t.pick_id}: `}
        {t.selection ?? "Untitled pick"}
        {t.odds_taken != null && (
          <span className="ml-2 text-[var(--color-text-soft)] tabular-nums">{formatOdds(t.odds_taken)}</span>
        )}
        {t.units != null && <span className="ml-2 text-[var(--color-text-soft)] tabular-nums">{`${t.units}u`}</span>}
      </div>
      {t.posted_label && (
        <div className="mt-[3px] text-[12px] font-semibold text-[var(--color-text-muted)]">
          {`Posted ${t.posted_label} PT`}
        </div>
      )}
      {rows.length > 0 && (
        <>
          <div className="mt-3 grid grid-cols-[72px_160px_160px] border-t border-[var(--color-border)] text-[11.5px] font-semibold text-[var(--color-text-muted)]">
            <div className="py-[5px]" />
            <div className="py-[5px] font-extrabold">This pick</div>
            <div className="py-[5px] font-extrabold">Already live</div>
            {rows.map((r) => (
              <div key={r.label} className="contents">
                <div className="py-[5px]">{r.label}</div>
                <div className={`${CELL} text-[var(--color-text)]`}>{r.mine}</div>
                <div className={`${CELL} text-[var(--color-text-soft)]`}>{r.live}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[12.5px] font-semibold text-[var(--color-text-soft)]">
            {`The ${differs}. ${SECOND_BET_SENTENCE}`}
          </div>
        </>
      )}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          className={OK}
          disabled={pending || !canApprove}
          onClick={(e) => {
            e.currentTarget.blur();
            onApproveAnyway(p.pick_id);
          }}
        >
          Approve as a second bet
        </button>
        <span className="text-[12px] font-semibold text-[var(--color-text-muted)]">
          Only if the capper really placed it twice. Reject it if it is the same bet.
        </span>
      </div>
    </section>
  );
}
