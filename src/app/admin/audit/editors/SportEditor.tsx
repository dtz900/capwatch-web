"use client";

import { ADMIN_SPORTS } from "@/lib/admin-sports";
import { ErrorLine, useEditorError, type EditorProps } from "./types";

export function SportEditor({ p, disabled, onPatch }: EditorProps) {
  const { error, run } = useEditorError(onPatch);
  const current = p.sport ?? "MLB";
  return (
    <div className="min-w-0">
      <div className="inline-flex border border-[var(--color-border)] rounded-lg overflow-hidden">
        {ADMIN_SPORTS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => (s !== current ? run({ sport: s }, `Sport set to ${s}`) : undefined)}
            className={`px-[13px] py-1.5 text-[12px] font-extrabold border-r border-[var(--color-border)] last:border-r-0 disabled:opacity-60 ${
              s === current ? "bg-[var(--color-text)] text-[#0a0a0c]" : "text-[var(--color-text-muted)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <ErrorLine error={error} />
    </div>
  );
}
