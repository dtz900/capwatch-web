"use client";
import { useState } from "react";
import { suggestCapper, type SuggestionStatus } from "@/lib/api";

const STATUS_COPY: Record<SuggestionStatus | "error", string> = {
  queued: "Thanks. We'll review and add if they qualify.",
  already_tracked: "We already track this handle.",
  duplicate: "This handle is already in our review queue.",
  invalid: "That doesn't look like a valid X handle.",
  error: "Something went wrong. Try again in a minute.",
};

export function SuggestCapperSection() {
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SuggestionStatus | "error" | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const status = await suggestCapper({ handle: handle.trim(), reason: reason.trim() || undefined });
      setResult(status);
      if (status === "queued") {
        setHandle("");
        setReason("");
      }
    } catch {
      setResult("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="my-12 py-9 border-t border-[var(--color-border)]">
      <div className="flex items-start justify-between gap-8 flex-wrap">
        <div className="max-w-md">
          <h3 className="text-[18px] font-extrabold tracking-[-0.015em] mb-1.5">
            Know a capper we should track?
          </h3>
          <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
            Suggest any public X account that posts MLB picks. Submissions are reviewed
            and added if they meet the catalog standard.
          </p>
        </div>
        <div className="w-full md:w-auto md:min-w-[420px]">
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-lg
                         border border-[var(--color-border-h)] bg-[var(--color-bg-card)]
                         text-sm font-bold hover:border-[rgba(255,255,255,0.20)]
                         transition-colors"
            >
              Suggest a capper
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-[var(--color-text-muted)]">
                  X handle
                </span>
                <div className="flex items-center gap-0">
                  <span className="px-3 py-2.5 text-sm font-semibold text-[var(--color-text-muted)]
                                   bg-[rgba(255,255,255,0.02)] border border-r-0 border-[var(--color-border)]
                                   rounded-l-lg">
                    @
                  </span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="handle"
                    maxLength={15}
                    autoFocus
                    required
                    pattern="[A-Za-z0-9_]+"
                    className="flex-1 px-3 py-2.5 text-sm font-semibold
                               bg-[rgba(255,255,255,0.015)] border border-[var(--color-border)]
                               rounded-r-lg outline-none
                               focus:border-[var(--color-gold)]
                               text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-[var(--color-text-muted)]">
                  Why include them <span className="opacity-60 normal-case tracking-normal">(optional)</span>
                </span>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Posts daily MLB picks with reasoning"
                  maxLength={500}
                  className="px-3 py-2.5 text-sm
                             bg-[rgba(255,255,255,0.015)] border border-[var(--color-border)]
                             rounded-lg outline-none
                             focus:border-[var(--color-gold)]
                             text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting || !handle.trim()}
                  className="flex-1 sm:flex-none px-4 py-3 sm:py-2.5 rounded-lg text-sm font-bold
                             bg-[var(--color-gold)] text-black
                             hover:brightness-110 active:brightness-95
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all"
                >
                  {submitting ? "Sending..." : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setResult(null); }}
                  className="px-3 py-3 sm:py-2.5 text-sm font-semibold
                             text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  Cancel
                </button>
              </div>
              {result && (
                <p
                  role="status"
                  aria-live="polite"
                  className={`text-[12px] mt-1 leading-relaxed ${
                    result === "queued" ? "text-[var(--color-pos)]" : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {STATUS_COPY[result]}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
