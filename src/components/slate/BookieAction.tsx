interface Props {
  awayUnits: number;
  homeUnits: number;
  otherUnits: number;
  allVoided: boolean;
}

function formatSigned(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "±";
  return `${sign}${Math.abs(n).toFixed(2)}u`;
}

function colorClass(n: number): string {
  if (n > 0) return "text-[var(--color-pos)]";
  if (n < 0) return "text-[var(--color-neg)]";
  return "text-[var(--color-text-muted)]";
}

export function BookieAction({ awayUnits, homeUnits, otherUnits, allVoided }: Props) {
  if (allVoided) {
    return (
      <div className="mt-6 pt-3 border-t border-[rgba(255,255,255,0.06)] text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--color-text-muted)]">
        Bookie action <span className="mx-2">·</span> all picks voided
      </div>
    );
  }
  const totalRisk = awayUnits + homeUnits + otherUnits;
  const netToBook = -totalRisk;
  return (
    <div className="mt-6 pt-3 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--color-text-muted)]">
      <span>Bookie action</span>
      <span className="text-[var(--color-text-muted)]">·</span>
      <span>
        AWAY backers <span className={`${colorClass(awayUnits)} tabular-nums`}>{formatSigned(awayUnits)}</span>
      </span>
      <span className="text-[var(--color-text-muted)]">·</span>
      <span>
        HOME backers <span className={`${colorClass(homeUnits)} tabular-nums`}>{formatSigned(homeUnits)}</span>
      </span>
      <span className="text-[var(--color-text-muted)]">·</span>
      <span>
        Other markets <span className={`${colorClass(otherUnits)} tabular-nums`}>{formatSigned(otherUnits)}</span>
      </span>
      <span className="text-[var(--color-text-muted)]">·</span>
      <span>
        Net to the book <span className={`${colorClass(netToBook)} tabular-nums`}>{formatSigned(netToBook)}</span>
      </span>
    </div>
  );
}
