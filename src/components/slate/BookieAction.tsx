interface Props {
  awayUnits: number;
  homeUnits: number;
  otherUnits: number;
  allVoided: boolean;
}

function formatSigned(n: number, opts: { showZeroSign?: boolean } = {}): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : opts.showZeroSign ? "±" : "";
  return `${sign}${Math.abs(n).toFixed(2)}u`;
}

function colorClass(n: number): string {
  if (n > 0) return "text-[var(--color-pos)]";
  if (n < 0) return "text-[var(--color-neg)]";
  return "text-[var(--color-text-muted)]";
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3">
      <span className="text-[9px] uppercase tracking-[0.22em] font-bold text-[var(--color-text-muted)]">
        {label}
      </span>
      <span
        className={`text-[17px] sm:text-[18px] font-extrabold tabular-nums tracking-tight ${colorClass(value)}`}
      >
        {formatSigned(value, { showZeroSign: true })}
      </span>
    </div>
  );
}

export function BookieAction({
  awayUnits,
  homeUnits,
  otherUnits,
  allVoided,
}: Props) {
  if (allVoided) {
    return (
      <div className="mt-7 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-5 py-4 text-center text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--color-text-muted)]">
        Bookie action <span className="mx-2 opacity-60">·</span> all picks voided
      </div>
    );
  }

  const netToBook = -(awayUnits + homeUnits + otherUnits);

  return (
    <div className="mt-7 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 border-b border-[rgba(255,255,255,0.06)] text-[10px] uppercase tracking-[0.20em] font-bold text-[var(--color-text-muted)]">
        <span>Bookie action</span>
        <span className="opacity-60 hidden sm:inline">per-side P&amp;L</span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.18)]">
        <Cell label="Away backers" value={awayUnits} />
        <Cell label="Home backers" value={homeUnits} />
        <Cell label="Other markets" value={otherUnits} />
      </div>

      <div className="flex items-baseline justify-between px-4 sm:px-5 py-3 border-t border-[rgba(255,255,255,0.06)]">
        <span className="text-[10px] uppercase tracking-[0.20em] font-bold text-[var(--color-text-muted)]">
          Net to the book
        </span>
        <span
          className={`text-[22px] sm:text-[26px] font-extrabold tabular-nums tracking-tight ${colorClass(netToBook)}`}
        >
          {formatSigned(netToBook, { showZeroSign: true })}
        </span>
      </div>
    </div>
  );
}
