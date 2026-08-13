"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PalaceCandidate } from "@/lib/types";
import { enrichAction, publishAction, unpublishAction } from "./actions";

const SECTIONS: {
  status: PalaceCandidate["status"];
  label: string;
  hint: string;
}[] = [
  { status: "candidate", label: "Needs enrich",
    hint: "Fresh winners. Enrich builds box scores, media, and recap." },
  { status: "draft", label: "Ready to publish",
    hint: "Enriched. Check the hero asset, then push it live." },
  { status: "published", label: "Live in the palace",
    hint: "Serving publicly. Pull removes the page and media instantly." },
];

export function PalaceQueueTable({ items }: { items: PalaceCandidate[] }) {
  const [error, setError] = useState<string | null>(null);
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-6 py-10 text-center text-[14px] text-[var(--color-text-soft)]">
        No winning parlays to curate.
      </div>
    );
  }
  return (
    <>
      {error && (
        <div className="rounded-md border border-[rgba(255,80,80,0.4)] bg-[rgba(255,80,80,0.08)] text-[12px] text-[var(--color-neg)] px-3 py-2 mb-3">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-6">
        {SECTIONS.map((s) => {
          const rows = items.filter((it) => it.status === s.status);
          if (rows.length === 0) return null;
          return (
            <section key={s.status}>
              <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-2 mb-0 px-1">
                <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-[#f7f3e9]">
                  {s.label}
                  <span className="ml-2 text-[var(--color-text-muted)] tabular-nums tracking-normal">
                    {rows.length}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] font-medium hidden sm:block">
                  {s.hint}
                </div>
              </div>
              <ul className="rounded-b-2xl border border-t-0 border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] overflow-hidden">
                {rows.map((it) => (
                  <Row key={it.parlay_id} it={it} onError={setError} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}

function Row({ it, onError }: {
  it: PalaceCandidate; onError: (s: string | null) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function run(fn: (id: number) => Promise<{ ok: boolean; error?: string }>) {
    onError(null);
    start(async () => {
      const r = await fn(it.parlay_id);
      if (!r.ok) { onError(`parlay ${it.parlay_id}: ${r.error}`); return; }
      router.refresh();
    });
  }
  const name = it.capper_handle
    ? `@${it.capper_handle}`
    : it.capper_display_name ?? `parlay #${it.parlay_id}`;
  return (
    <li className="border-b border-[var(--color-border)] last:border-b-0 px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
      <div className="min-w-0 flex-1 basis-[220px]">
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-bold truncate">{name}</span>
          <StatusPill status={it.status} />
        </div>
        <div className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1 tabular-nums">
          graded {it.graded_at?.slice(0, 10) ?? "—"} · parlay #{it.parlay_id}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Pill>{it.leg_count}-leg</Pill>
        {it.combined_odds != null && (
          <Pill>+{it.combined_odds.toLocaleString("en-US")}</Pill>
        )}
      </div>

      <div className="w-[110px] text-right">
        <div className="text-[20px] font-extrabold tabular-nums tracking-[-0.02em] leading-none text-[var(--color-pos)]">
          +{it.profit_units.toFixed(2)}u
        </div>
        <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] font-bold mt-1">
          profit
        </div>
      </div>

      <div className="flex gap-2">
        <ActionButton
          kind={it.status === "candidate" ? "primary" : "ghost"}
          onClick={() => run(enrichAction)}
          pending={pending}
        >
          {it.status === "candidate" ? "Enrich" : "Re-enrich"}
        </ActionButton>
        <ActionButton
          kind={it.status === "draft" ? "publish" : "publish-ghost"}
          onClick={() => run(publishAction)}
          pending={pending}
        >
          {it.status === "published" ? "Republish" : "Publish"}
        </ActionButton>
        <ActionButton
          kind={it.status === "published" ? "pull" : "pull-ghost"}
          onClick={() => run(unpublishAction)}
          pending={pending}
        >
          Pull
        </ActionButton>
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: PalaceCandidate["status"] }) {
  if (status === "candidate") {
    return (
      <span className="inline-flex items-center rounded-full border border-[rgba(247,243,233,0.35)] bg-[rgba(247,243,233,0.08)] text-[#f7f3e9] text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5">
        New
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--color-border-h)] bg-[rgba(255,255,255,0.04)] text-[var(--color-text-soft)] text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5">
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(25,245,124,0.3)] bg-[var(--color-pos-soft)] text-[var(--color-pos)] text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5">
      <span className="w-1 h-1 rounded-full bg-[var(--color-pos)]" />
      Live
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--color-border-h)] bg-[rgba(255,255,255,0.03)] text-[var(--color-text-soft)] text-[11px] font-bold tabular-nums px-2.5 py-1">
      {children}
    </span>
  );
}

const BUTTON_STYLES = {
  primary:
    "bg-[#f7f3e9] text-black border border-transparent hover:bg-white",
  ghost:
    "bg-transparent text-[var(--color-text-soft)] border border-[var(--color-border-h)] hover:bg-[rgba(255,255,255,0.05)]",
  publish:
    "bg-[var(--color-pos)] text-black border border-transparent hover:brightness-110",
  "publish-ghost":
    "bg-transparent text-[var(--color-pos)] border border-[rgba(25,245,124,0.3)] hover:bg-[var(--color-pos-soft)]",
  pull:
    "bg-[var(--color-neg)] text-white border border-transparent hover:brightness-110",
  "pull-ghost":
    "bg-transparent text-[var(--color-neg)] border border-[rgba(239,68,68,0.3)] hover:bg-[var(--color-neg-soft)]",
} as const;

function ActionButton({ kind, onClick, pending, children }: {
  kind: keyof typeof BUTTON_STYLES;
  onClick: () => void;
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 ${BUTTON_STYLES[kind]}`}
    >
      {pending ? "…" : children}
    </button>
  );
}
