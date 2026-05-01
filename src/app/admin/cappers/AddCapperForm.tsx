"use client";

import { useState, useTransition } from "react";
import { addCapperAction, type AddCapperResult } from "./actions";

const STATUS_LABEL: Record<"added" | "reactivated" | "already_tracking", string> = {
  added: "Added",
  reactivated: "Reactivated",
  already_tracking: "Already tracked",
};

const STATUS_TONE: Record<"added" | "reactivated" | "already_tracking", string> = {
  added: "bg-[var(--color-pos-soft)] text-[var(--color-pos)]",
  reactivated: "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)]",
  already_tracking: "bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)]",
};

const SPORT_OPTIONS = ["MLB", "NBA", "NFL", "NHL", "MLS", "UFC", "NCAAF", "NCAAB"] as const;

const FIELD =
  "w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[rgba(255,255,255,0.20)] disabled:opacity-50";

const LABEL =
  "text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold";

export function AddCapperForm() {
  const [handle, setHandle] = useState("");
  const [tier, setTier] = useState<1 | 2 | 3>(2);
  const [displayName, setDisplayName] = useState("");
  const [notes, setNotes] = useState("");
  const [sportTags, setSportTags] = useState<string[]>(["MLB"]);
  const [hasPaidService, setHasPaidService] = useState(false);
  const [paidServiceName, setPaidServiceName] = useState("");
  const [paidServiceUrl, setPaidServiceUrl] = useState("");
  const [paidServicePrice, setPaidServicePrice] = useState("");
  const [backfillDays, setBackfillDays] = useState<number>(30);
  const [result, setResult] = useState<AddCapperResult | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleSport = (sport: string) => {
    setSportTags((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    const priceNum = paidServicePrice.trim() ? Number(paidServicePrice) : undefined;
    startTransition(async () => {
      const res = await addCapperAction({
        handle,
        tier,
        display_name: displayName || undefined,
        notes: notes || undefined,
        sport_tags: sportTags.length > 0 ? sportTags : undefined,
        has_paid_service: hasPaidService,
        paid_service_name: hasPaidService && paidServiceName ? paidServiceName : undefined,
        paid_service_url: hasPaidService && paidServiceUrl ? paidServiceUrl : undefined,
        paid_service_price_per_month:
          hasPaidService && priceNum !== undefined && Number.isFinite(priceNum) && priceNum > 0
            ? priceNum
            : undefined,
        backfill_days: backfillDays > 0 ? backfillDays : undefined,
      });
      setResult(res);
      if (res.ok) {
        setHandle("");
        setDisplayName("");
        setNotes("");
        setHasPaidService(false);
        setPaidServiceName("");
        setPaidServiceUrl("");
        setPaidServicePrice("");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 py-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3 items-end">
        <label className="block">
          <span className={LABEL}>X handle</span>
          <div className="mt-1.5 flex items-center rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] focus-within:border-[rgba(255,255,255,0.20)]">
            <span className="pl-3 pr-1 text-[var(--color-text-muted)] text-sm font-semibold">@</span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="handle"
              required
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              className="flex-1 bg-transparent py-2 pr-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
            />
          </div>
        </label>

        <label className="block">
          <span className={LABEL}>Tier</span>
          <select
            value={tier}
            onChange={(e) => setTier(Number(e.target.value) as 1 | 2 | 3)}
            disabled={pending}
            className={`mt-1.5 ${FIELD}`}
          >
            <option value={1}>1 (sharp)</option>
            <option value={2}>2 (emerging)</option>
            <option value={3}>3 (paid tout)</option>
          </select>
        </label>
      </div>

      <div className="mt-5">
        <span className={LABEL}>Sport tags</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {SPORT_OPTIONS.map((sport) => {
            const active = sportTags.includes(sport);
            return (
              <button
                key={sport}
                type="button"
                onClick={() => toggleSport(sport)}
                disabled={pending}
                className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-[0.10em] transition-colors disabled:opacity-50 ${
                  active
                    ? "bg-[rgba(96,165,250,0.18)] border border-[rgba(96,165,250,0.50)] text-[#93c5fd]"
                    : "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.10)] text-[var(--color-text-muted)] hover:bg-[rgba(255,255,255,0.06)]"
                }`}
              >
                {sport}
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 text-[10px] text-[var(--color-text-muted)] font-medium">
          Defaults to MLB if none selected.
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3">
        <label className="block">
          <span className={LABEL}>Display name (optional)</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={pending}
            className={`mt-1.5 ${FIELD}`}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Recon notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            disabled={pending}
            className={`mt-1.5 ${FIELD}`}
          />
        </label>
      </div>

      <div className="mt-5 rounded-md border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.18)] px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className={LABEL}>Backfill history</span>
            <div className="text-[11px] text-[var(--color-text-muted)] font-medium mt-0.5">
              Pulls past tweets via the X user-timeline API so the parser has rows to chew on immediately.
            </div>
          </div>
          <select
            value={backfillDays}
            onChange={(e) => setBackfillDays(Number(e.target.value))}
            disabled={pending}
            className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] px-3 py-2 text-sm text-[var(--color-text)] outline-none"
          >
            <option value={0}>Skip</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>To opening day (~365)</option>
          </select>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.18)] px-4 py-3">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasPaidService}
            onChange={(e) => setHasPaidService(e.target.checked)}
            disabled={pending}
            className="w-4 h-4 accent-[#3b82f6] cursor-pointer"
          />
          <span className="text-[12px] font-bold text-[var(--color-text)]">
            Sells a paid product
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
            Discord, DubClub, Whop, etc.
          </span>
        </label>
        {hasPaidService && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px] gap-3">
            <label className="block">
              <span className={LABEL}>Service name</span>
              <input
                type="text"
                value={paidServiceName}
                onChange={(e) => setPaidServiceName(e.target.value)}
                disabled={pending}
                placeholder="DubClub VIP"
                className={`mt-1.5 ${FIELD}`}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Service URL</span>
              <input
                type="url"
                value={paidServiceUrl}
                onChange={(e) => setPaidServiceUrl(e.target.value)}
                disabled={pending}
                placeholder="https://"
                className={`mt-1.5 ${FIELD}`}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Price/mo</span>
              <div className="mt-1.5 flex items-center rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] focus-within:border-[rgba(255,255,255,0.20)]">
                <span className="pl-3 pr-1 text-[var(--color-text-muted)] text-sm font-semibold">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidServicePrice}
                  onChange={(e) => setPaidServicePrice(e.target.value)}
                  disabled={pending}
                  placeholder="49"
                  className="flex-1 bg-transparent py-2 pr-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] tabular-nums"
                />
              </div>
            </label>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={pending || !handle.trim()}
          className="px-4 py-2 rounded-md bg-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.16)] disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-bold text-[var(--color-text)]"
        >
          {pending ? "Adding..." : "Add capper"}
        </button>
        <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
          Inserts row, refreshes X stream rule, resolves twitter_user_id.
        </span>
      </div>

      {result && (
        <div className="mt-4 rounded-md border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.25)] px-4 py-3 text-[12px]">
          {result.ok ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-[0.10em] ${STATUS_TONE[result.status]}`}
                >
                  {STATUS_LABEL[result.status]}
                </span>
                <span className="font-semibold text-[var(--color-text)]">
                  @{result.capper.handle}
                </span>
                <span className="text-[var(--color-text-muted)]">id={result.capper.id}</span>
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] font-medium">
                tier={result.capper.tier ?? "unset"} · twitter_user_id=
                {result.capper.twitter_user_id ?? (
                  <span className="text-[var(--color-neg)]">unresolved</span>
                )}
              </div>
              {result.status === "added" && !result.capper.twitter_user_id && (
                <div className="text-[11px] text-[var(--color-neg)] font-medium">
                  Handle did not resolve on X. Row inserted but no tweets will ingest until corrected.
                </div>
              )}
              {result.backfill && (
                <div className="text-[11px] text-[var(--color-text-muted)] font-medium border-t border-[rgba(255,255,255,0.06)] pt-1.5 mt-0.5">
                  <span className="font-bold uppercase tracking-[0.10em] text-[10px] mr-2">backfill</span>
                  {result.backfill.ok ? (
                    <span>
                      <span className="text-[var(--color-pos)]">ok</span> · fetched=
                      {result.backfill.fetched ?? 0} · upserted=
                      {result.backfill.upserted ?? 0} · pages=
                      {result.backfill.pages ?? 0}
                      {typeof result.backfill.final_mtd_usd === "number" && (
                        <> · MTD=${result.backfill.final_mtd_usd.toFixed(2)}</>
                      )}
                    </span>
                  ) : (
                    <span className="text-[var(--color-neg)]">
                      {result.backfill.reason ?? "failed"}
                      {result.backfill.error ? `: ${result.backfill.error}` : ""}
                      {result.backfill.note ? ` (${result.backfill.note})` : ""}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[var(--color-neg)] font-semibold">{result.error}</div>
          )}
        </div>
      )}
    </form>
  );
}
