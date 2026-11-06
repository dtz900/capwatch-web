"use client";

import { useState } from "react";
import { ErrorLine, INPUT_CLASS, useEditorError, type EditorProps } from "./types";

type Field = "line" | "odds_taken" | "units";
const LABEL: Record<Field, string> = { line: "Line", odds_taken: "Odds", units: "Stake" };
const PLACEHOLDER: Record<Field, string> = { line: "e.g. 27.5", odds_taken: "e.g. -110", units: "e.g. 1" };

export function TextEditor({ p, disabled, onPatch, field }: EditorProps & { field: Field }) {
  const current = p[field];
  const [text, setText] = useState(current == null ? "" : String(current));
  const [invalid, setInvalid] = useState<string | null>(null);
  const { error, run } = useEditorError(onPatch);

  const submit = () => {
    const n = text.trim() === "" ? NaN : Number(text);
    if (!Number.isFinite(n)) return setInvalid("Enter a number");
    if (field === "odds_taken" && !Number.isInteger(n)) return setInvalid("Odds must be a whole number");
    setInvalid(null);
    void run({ [field]: n }, `${LABEL[field]} set to ${n}`);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={PLACEHOLDER[field]}
          aria-label={LABEL[field]}
          className={`${INPUT_CLASS} w-[120px] tabular-nums`}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={submit}
          className="border border-[var(--color-border)] rounded-lg px-3 py-[7px] text-[12px] font-extrabold text-[var(--color-text-soft)] disabled:opacity-50"
        >
          Set
        </button>
      </div>
      {invalid && <div className="mt-2 text-[12px] font-semibold text-[var(--color-neg)]">{invalid}</div>}
      <ErrorLine error={error} />
    </div>
  );
}
