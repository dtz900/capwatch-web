interface Props {
  count: number;
}

export function DeletedPicksPill({ count }: Props) {
  if (!count || count <= 0) return null;
  return (
    <span
      title={`${count} parsed pick${count === 1 ? "" : "s"} where the original tweet has been deleted from X. The pick is still graded against the final outcome.`}
      className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.12em]
                 bg-[rgba(239,68,68,0.10)] text-[var(--color-neg)]
                 border border-[rgba(239,68,68,0.30)]
                 px-1.5 py-0.5 rounded"
    >
      <span className="leading-none">×</span>
      <span>{count} deleted</span>
    </span>
  );
}
