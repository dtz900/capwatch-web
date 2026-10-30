"use client";

import { useState, useTransition } from "react";
import {
  grantVipSubscriptionAction,
  revokeVipSubscriptionAction,
  type VipGrantResult,
} from "./actions";

const INPUT_CLASS =
  "w-full rounded-md border border-[rgba(255,255,255,0.12)] bg-transparent px-3 py-2 text-sm";
const BUTTON_CLASS =
  "rounded-md border border-[rgba(255,255,255,0.18)] px-4 py-2 text-sm font-semibold disabled:opacity-50";

export function VipGrantForm() {
  const [email, setEmail] = useState("");
  const [capper, setCapper] = useState("");
  const [days, setDays] = useState(30);
  const [line, setLine] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(kind: "grant" | "revoke") {
    const handle = capper.trim().replace(/^@/, "");
    const userEmail = email.trim();
    if (!userEmail || !handle) {
      setLine("Email and capper are required");
      return;
    }
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      setLine("Days must be a whole number from 1 to 3650");
      return;
    }
    const input = { user_email: userEmail, capper: handle, days };
    startTransition(async () => {
      let result: VipGrantResult;
      try {
        result =
          kind === "grant"
            ? await grantVipSubscriptionAction(input)
            : await revokeVipSubscriptionAction(input);
      } catch (err: unknown) {
        result = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
      if (!result.ok) {
        setLine(result.error);
      } else if (kind === "grant") {
        const end = result.row.current_period_end;
        const until = end ? ` until ${end.slice(0, 10)}` : "";
        setLine(`Granted: @${handle} for ${userEmail}${until}`);
      } else {
        setLine(`Revoked: @${handle} for ${userEmail}`);
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <label className="block text-sm">
        <span className="mb-1 block">User email</span>
        <input className={INPUT_CLASS} type="email" value={email}
          onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block">Capper handle or id</span>
        <input className={INPUT_CLASS} value={capper}
          onChange={(e) => setCapper(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block">Days</span>
        <input className={INPUT_CLASS} type="number" min={1} max={3650} value={days}
          onChange={(e) => setDays(Number(e.target.value))} />
      </label>
      <div className="flex gap-3">
        <button type="button" className={BUTTON_CLASS} disabled={pending}
          onClick={() => submit("grant")}>Grant</button>
        <button type="button" className={BUTTON_CLASS} disabled={pending}
          onClick={() => submit("revoke")}>Revoke</button>
      </div>
      {line && <p className="text-sm" role="status">{line}</p>}
    </form>
  );
}
