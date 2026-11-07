import type { ReactNode } from "react";
import type { FieldState } from "./fieldState";

export const ROW_CLASS =
  "grid grid-cols-[96px_1fr_auto] gap-3.5 items-center py-[11px] border-b border-[var(--color-border)]";
export const LABEL_CLASS =
  "text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[var(--color-text-muted)]";

interface Props {
  state: FieldState;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

export function FieldRow({ state, open, onToggle, children }: Props) {
  const showEditor = open || state.red;
  return (
    <div className={ROW_CLASS}>
      <div className={LABEL_CLASS}>{state.label}</div>
      <div className="min-w-0">
        {state.red ? (
          <>
            <span className="text-[14.5px] font-bold text-[var(--color-neg)]">
              {state.value ?? state.note ?? "Needs fixing"}
            </span>
            {state.value != null && state.note && (
              <span className="ml-2 text-[12px] font-semibold text-[var(--color-text-muted)]">{state.note}</span>
            )}
          </>
        ) : (
          <>
            <span
              className={`text-[14.5px] font-bold ${state.value == null ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]"}`}
            >
              {state.value ?? "None"}
            </span>
            {state.note && (
              <span className="ml-2 text-[12px] font-semibold text-[var(--color-text-muted)]">{state.note}</span>
            )}
          </>
        )}
      </div>
      {state.red ? (
        <span className="text-[11.5px] font-extrabold text-[var(--color-neg)]">Needs fixing</span>
      ) : state.fixed ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="text-[11.5px] font-extrabold text-[var(--color-pos)] hover:opacity-80"
        >
          Fixed
        </button>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="text-[11.5px] font-extrabold text-[var(--color-text-muted)] hover:text-[var(--color-text-soft)]"
        >
          Edit
        </button>
      )}
      {showEditor && children != null && <div className="col-span-2 col-start-2">{children}</div>}
    </div>
  );
}
