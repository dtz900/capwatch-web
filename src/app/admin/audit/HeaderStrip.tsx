import { AddBetButton } from "./AddBetButton";

interface Props {
  needsYou: number;
  settled: number;
  pending: number;
  graded: number;
  pickIdValue: number | undefined;
}

const fmt = (n: number) => n.toLocaleString("en-US");

function Mini({ n, children }: { n: number; children: string }) {
  return (
    <div className="text-[12px] font-semibold text-[var(--color-text-muted)]">
      <b className="mr-[5px] font-extrabold text-[var(--color-text-soft)] tabular-nums">{fmt(n)}</b>
      {children}
    </div>
  );
}

export function HeaderStrip({ needsYou, settled, pending, graded, pickIdValue }: Props) {
  return (
    <div className="flex-none flex items-center gap-7 px-6 py-[14px] border-b border-[var(--color-border)]">
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Audit</h1>
      <div className="flex items-baseline gap-2">
        <b className="text-[30px] font-extrabold tracking-[-0.03em] leading-none tabular-nums">{fmt(needsYou)}</b>
        <span className="text-[12px] font-bold text-[var(--color-text-soft)]">need you</span>
      </div>
      <div className="flex gap-[22px]">
        <Mini n={settled}>settled, one click to clear</Mini>
        <Mini n={pending}>pending, will grade themselves</Mini>
        <Mini n={graded}>graded</Mini>
      </div>
      <div className="ml-auto flex items-center gap-[10px]">
        <form method="GET" action="/admin/audit">
          <input
            name="pick_id"
            type="number"
            min={1}
            defaultValue={pickIdValue ?? ""}
            placeholder="Find pick by ID"
            aria-label="Find pick by ID"
            className="w-[150px] rounded-lg border border-[rgba(255,255,255,0.13)] bg-transparent px-[11px] py-[7px] text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-text-soft)] tabular-nums"
          />
        </form>
        <AddBetButton />
      </div>
    </div>
  );
}
