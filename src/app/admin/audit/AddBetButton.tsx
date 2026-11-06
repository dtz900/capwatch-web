"use client";

export const ADD_BET_EVENT = "audit:add-bet";

/** Opens the add-bet drawer owned by Workbench without making HeaderStrip a client component. */
export function AddBetButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(ADD_BET_EVENT))}
      className="rounded-lg border border-[rgba(255,255,255,0.13)] px-[13px] py-[7px] text-[12px] font-extrabold hover:border-[var(--color-text-soft)]"
    >
      + Add bet
    </button>
  );
}
