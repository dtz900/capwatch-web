"use client";

import { useEffect } from "react";
import { AddBetPanel } from "./AddBetPanel";

export function AddBetDrawer({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-label="Add bet manually"
        className="fixed inset-y-0 right-0 w-[560px] max-w-full bg-[var(--color-bg)] border-l border-[rgba(255,255,255,0.13)] z-40 overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-[14px] border-b border-[var(--color-border)]">
          <h2 className="text-[14px] font-extrabold">Add bet manually</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[rgba(255,255,255,0.13)] px-[11px] py-[6px] text-[12px] font-extrabold hover:border-[var(--color-text-soft)]"
          >
            Close
          </button>
        </div>
        <div className="p-5">
          <AddBetPanel embedded />
        </div>
      </aside>
    </>
  );
}
