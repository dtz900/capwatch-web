"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCapperAction } from "../../actions";

interface EditCapperPanelProps {
  capperId: number;
  initialHandle: string;
  initialDisplayName: string | null;
}

export function EditCapperPanel({
  capperId,
  initialHandle,
  initialDisplayName,
}: EditCapperPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [handle, setHandle] = useState(initialHandle);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [overrideUrl, setOverrideUrl] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const dirty =
    handle.trim().replace(/^@/, "") !== initialHandle ||
    displayName.trim() !== (initialDisplayName ?? "") ||
    (overrideUrl && twitterUrl.trim().length > 0);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) {
      setMsg({ kind: "err", text: "No changes to save." });
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const result = await updateCapperAction({
        capper_id: capperId,
        handle: handle.trim().replace(/^@/, ""),
        display_name: displayName.trim(),
        twitter_url: overrideUrl ? twitterUrl.trim() : undefined,
      });
      if (!result.ok) {
        setMsg({ kind: "err", text: result.error });
        return;
      }
      if (result.slug_changed) {
        router.push(`/admin/cappers/${encodeURIComponent(result.capper.handle)}/picks`);
        router.refresh();
      } else {
        setMsg({ kind: "ok", text: "Saved." });
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
            Edit capper
          </div>
          <div className="text-[12px] text-[var(--color-text-soft)] mt-0.5">
            Handle / display name. URL auto-updates when handle changes.
          </div>
        </div>
        <div className="text-[var(--color-text-muted)] text-sm font-bold">
          {open ? "−" : "+"}
        </div>
      </button>
      {open && (
        <form onSubmit={onSubmit} className="px-5 pb-5 pt-1 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold mb-1">
                Handle
              </div>
              <div className="flex items-center rounded-md border border-[rgba(255,255,255,0.10)] bg-[rgba(0,0,0,0.25)] focus-within:border-[rgba(255,255,255,0.20)]">
                <span className="pl-3 pr-1 text-[var(--color-text-muted)] text-sm font-semibold">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="bg-transparent py-1.5 pr-3 text-sm text-[var(--color-text)] outline-none w-full"
                />
              </div>
            </label>
            <label className="block">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-bold mb-1">
                Display name
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="off"
                className="w-full rounded-md border border-[rgba(255,255,255,0.10)] bg-[rgba(0,0,0,0.25)] focus:border-[rgba(255,255,255,0.20)] py-1.5 px-3 text-sm text-[var(--color-text)] outline-none"
              />
            </label>
          </div>

          <div>
            <label className="inline-flex items-center gap-2 text-[11px] text-[var(--color-text-soft)] font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={overrideUrl}
                onChange={(e) => setOverrideUrl(e.target.checked)}
              />
              Override twitter_url manually
            </label>
            {overrideUrl && (
              <input
                type="text"
                placeholder="https://twitter.com/handle"
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                className="mt-2 w-full rounded-md border border-[rgba(255,255,255,0.10)] bg-[rgba(0,0,0,0.25)] focus:border-[rgba(255,255,255,0.20)] py-1.5 px-3 text-sm text-[var(--color-text)] outline-none"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending || !dirty}
              className="px-3 py-1.5 rounded-md bg-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.16)] disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-bold text-[var(--color-text)]"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            {msg && (
              <div
                className={`text-[12px] font-medium ${
                  msg.kind === "ok"
                    ? "text-[var(--color-pos)]"
                    : "text-[var(--color-neg)]"
                }`}
              >
                {msg.text}
              </div>
            )}
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] font-medium">
            Heads up: changing the handle changes the public slug. Old
            <code className="bg-[rgba(255,255,255,0.05)] px-1 mx-1 rounded">/cappers/{initialHandle}</code>
            URL will 404 after save.
          </div>
        </form>
      )}
    </section>
  );
}
