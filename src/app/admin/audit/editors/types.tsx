import { useState } from "react";
import type { PickPatchInput } from "../actions";
import type { QueueRow } from "../labels";
import type { PickHint } from "../usePatchFlow";

export interface EditorProps {
  p: QueueRow;
  disabled: boolean;
  /** Rejects with the failure message when the patch did not land. */
  onPatch: (patch: PickPatchInput, okMessage: string, propagate?: boolean, hint?: PickHint) => Promise<void>;
}

/** Wraps onPatch with an editor-local error line shown under the editor. */
export function useEditorError(onPatch: EditorProps["onPatch"]) {
  const [error, setError] = useState<string | null>(null);
  const run: EditorProps["onPatch"] = async (patch, okMessage, propagate, hint) => {
    setError(null);
    try {
      await onPatch(patch, okMessage, propagate, hint);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return { error, run };
}

export function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="mt-2 text-[12px] font-semibold text-[var(--color-neg)]">{error}</div>;
}

export const HINT_CLASS = "text-[11.5px] font-semibold text-[var(--color-text-muted)]";
export const INPUT_CLASS =
  "bg-transparent border border-[rgba(247,243,233,0.16)] rounded-lg px-[11px] py-[7px] outline-none font-bold text-[13px] text-[var(--color-text)]";
export const OPTS_CLASS = "mt-2 border border-[var(--color-border)] rounded-lg overflow-hidden";
export const OPT_CLASS =
  "grid grid-cols-[1fr_auto_auto] gap-[14px] items-center w-full px-3 py-[9px] text-left border-b border-[var(--color-border)] last:border-b-0 hover:bg-[rgba(247,243,233,0.05)] disabled:opacity-50";
