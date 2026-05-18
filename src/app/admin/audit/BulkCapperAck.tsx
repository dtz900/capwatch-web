"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ackAuditAction } from "./actions";

/** Post-onboard/backfill action: clear a capper's entire settled
 * book-rules-correct void noise in one shot. Only rendered when a capper
 * filter is active (otherwise it would ack across all cappers). */
export function BulkCapperAck({ capper }: { capper: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (
      !window.confirm(
        `Acknowledge ALL settled voids for @${capper} ` +
          `(player didn't play, game data gap, ungradeable)?\n\n` +
          `This only hides them from the triage queue. Grades are unchanged ` +
          `and you can Unack later.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await ackAuditAction({ capper });
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setMsg(`Acknowledged ${res.acked}`);
    router.refresh();
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="px-3 py-1.5 rounded-md bg-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.18)]
                   text-[12px] font-bold text-[var(--color-text)] disabled:opacity-50"
      >
        {busy ? "Working..." : `Ack all settled voids for @${capper}`}
      </button>
      {msg && (
        <span className="text-[11px] font-medium text-[var(--color-text-soft)]">
          {msg}
        </span>
      )}
    </span>
  );
}
