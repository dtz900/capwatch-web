"use client";

import { humanizeStat } from "@/lib/team-names";
import type { MarketDef } from "../actions";
import { ErrorLine, HINT_CLASS, useEditorError, type EditorProps } from "./types";

export function MarketEditor({
  p,
  disabled,
  onPatch,
  markets,
}: EditorProps & { markets: MarketDef[] | null | string }) {
  const { error, run } = useEditorError(onPatch);
  if (markets === null) return <div className={HINT_CLASS}>Loading markets...</div>;
  if (typeof markets === "string") return <div className={HINT_CLASS}>Markets failed to load: {markets}</div>;
  const current = p.stat_name ?? p.market;
  return (
    <div>
      <div className={`${HINT_CLASS} mb-2`}>{p.sport ?? "MLB"} markets</div>
      <div className="flex flex-wrap gap-1.5">
        {markets.map((m) => (
          <button
            key={m.stat_name}
            type="button"
            disabled={disabled}
            onClick={() =>
              run({ stat_name: m.stat_name, market: m.stat_name }, `Market set to ${humanizeStat(m.stat_name)}`)
            }
            className={`border rounded-md px-2.5 py-[5px] text-[12px] font-bold disabled:opacity-60 ${
              m.stat_name === current
                ? "bg-[var(--color-text)] text-[#0a0a0c] border-[var(--color-text)]"
                : "border-[var(--color-border)] text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
            }`}
          >
            {humanizeStat(m.stat_name)}
          </button>
        ))}
      </div>
      <ErrorLine error={error} />
    </div>
  );
}
