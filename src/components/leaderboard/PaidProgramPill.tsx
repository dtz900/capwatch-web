export function PaidProgramPill() {
  return (
    <span
      title="This capper sells paid picks. Public picks may not represent their full action."
      className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.12em]
                 bg-[rgba(251,191,36,0.10)] text-[#fbbf24]
                 border border-[rgba(251,191,36,0.30)]
                 px-1.5 py-0.5 rounded"
    >
      <span className="leading-none">$</span>
      <span>Paid Picks</span>
    </span>
  );
}
