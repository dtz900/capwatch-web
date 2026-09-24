"use client";

import { useMemo, useState } from "react";
import { formatUnits } from "@/lib/formatters";

export interface StableRef {
  handle: string;
  /** Null for a whole-capper tail; the market list for a scoped one. */
  markets: string[] | null;
}

export interface UserRow {
  userId: string;
  email: string | null;
  username: string | null;
  tier: string | null;
  createdAt: string | null;
  /** The capper this account verified as, when it claimed one through X. */
  capperHandle: string | null;
  stable: StableRef[];
  slip: { total: number; wins: number; losses: number; pushes: number; pending: number; units: number };
  lastSlipAt: string | null;
  tof: { plays: number; wins: number; losses: number; pushes: number; units: number; streak: number; lastPlayed: string | null } | null;
}

type SortKey = "joined" | "active" | "stable" | "units";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "joined", label: "Newest" },
  { key: "active", label: "Most active" },
  { key: "stable", label: "Biggest stable" },
  { key: "units", label: "Units" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* Everything a row has done: tails, logged bets, hands played. One number, so
   the accounts that signed up and never came back sink and the people
   actually using the site float. */
function activity(u: UserRow): number {
  return u.stable.length + u.slip.total + (u.tof?.plays ?? 0);
}

const LABEL = "text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]";

function Record({ wins, losses, pushes, units }: { wins: number; losses: number; pushes: number; units: number }) {
  return (
    <span className="flex items-baseline justify-end gap-2 tabular-nums">
      <span className="text-[13px] font-extrabold text-[var(--color-text)]">
        {wins}-{losses}
        {pushes > 0 ? `-${pushes}` : ""}
      </span>
      <span className={units >= 0 ? "text-[13px] font-extrabold text-[var(--color-pos)]" : "text-[13px] font-extrabold text-[var(--color-neg)]"}>
        {formatUnits(units)}u
      </span>
    </span>
  );
}

export function UsersTable({ rows }: { rows: UserRow[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("joined");
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((u) =>
          [u.email, u.username, u.capperHandle, u.userId, ...u.stable.map((s) => s.handle)]
            .filter((v): v is string => !!v)
            .some((v) => v.toLowerCase().includes(needle)),
        )
      : rows;
    const sorted = [...filtered];
    if (sort === "joined") sorted.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    if (sort === "active") sorted.sort((a, b) => activity(b) - activity(a));
    if (sort === "stable") sorted.sort((a, b) => b.stable.length - a.stable.length);
    if (sort === "units") {
      sorted.sort((a, b) => b.slip.units + (b.tof?.units ?? 0) - (a.slip.units + (a.tof?.units ?? 0)));
    }
    return sorted;
  }, [rows, q, sort]);

  return (
    <>
      <div className="sticky top-16 z-20 -mx-7 border-b border-[var(--color-border)] bg-[#0a0a0c] px-7 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email, username, capper"
            className="h-8 w-[260px] max-w-full rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 text-[13px] font-semibold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-h)] focus:outline-none"
          />
          <div className="flex gap-1">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={
                  sort === s.key
                    ? "whitespace-nowrap rounded-md bg-[rgba(255,255,255,0.10)] px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.10em] text-[var(--color-text)]"
                    : "whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.10em] text-[var(--color-text-muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-text)]"
                }
              >
                {s.label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[11px] font-bold tabular-nums text-[var(--color-text-muted)]">
            {shown.length} of {rows.length}
          </span>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border)]">
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-4 py-2">
          <span className={`flex-1 ${LABEL}`}>Account</span>
          <span className={`hidden w-[70px] shrink-0 text-right sm:block ${LABEL}`}>Stable</span>
          <span className={`hidden w-[150px] shrink-0 text-right md:block ${LABEL}`}>Bet slip</span>
          <span className={`w-[150px] shrink-0 text-right ${LABEL}`}>Tail or Fade</span>
          <span className={`hidden w-[64px] shrink-0 text-right lg:block ${LABEL}`}>Joined</span>
        </div>
        {shown.length === 0 ? (
          <p className="px-4 py-6 text-[13px] font-semibold text-[var(--color-text-muted)]">Nobody matches that.</p>
        ) : (
          shown.map((u) => {
            const quiet = activity(u) === 0;
            const open = openId === u.userId;
            return (
              <div key={u.userId} className="border-b border-[var(--color-border)] last:border-b-0">
                <button
                  onClick={() => setOpenId(open ? null : u.userId)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[rgba(255,255,255,0.02)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={quiet ? "truncate text-[14px] font-bold text-[var(--color-text-soft)]" : "truncate text-[14px] font-bold text-[var(--color-text)]"}>
                        {u.username ?? u.email ?? "(no email on file)"}
                      </span>
                      {u.capperHandle && (
                        <span className="rounded border border-[var(--color-pos)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[var(--color-pos)]">
                          @{u.capperHandle}
                        </span>
                      )}
                      {u.tier === "vip" && (
                        <span className="rounded border border-[var(--color-gold)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[var(--color-gold)]">
                          VIP
                        </span>
                      )}
                      {!u.createdAt && (
                        <span className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                          roster pending
                        </span>
                      )}
                    </span>
                    {u.username && u.email && (
                      <span className="mt-0.5 block truncate text-[11px] font-semibold text-[var(--color-text-muted)]">
                        {u.email}
                      </span>
                    )}
                  </span>

                  <span className="hidden w-[70px] shrink-0 text-right text-[13px] font-extrabold tabular-nums sm:block">
                    {u.stable.length > 0 ? (
                      <span className="text-[var(--color-text)]">{u.stable.length}</span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">-</span>
                    )}
                  </span>

                  <span className="hidden w-[150px] shrink-0 text-right md:block">
                    {u.slip.total === 0 ? (
                      <span className="text-[13px] font-extrabold text-[var(--color-text-muted)]">-</span>
                    ) : (
                      <Record {...u.slip} />
                    )}
                  </span>

                  <span className="w-[150px] shrink-0 text-right">
                    {!u.tof || u.tof.plays === 0 ? (
                      <span className="text-[13px] font-extrabold text-[var(--color-text-muted)]">-</span>
                    ) : (
                      <Record wins={u.tof.wins} losses={u.tof.losses} pushes={u.tof.pushes} units={u.tof.units} />
                    )}
                  </span>

                  <span className="hidden w-[64px] shrink-0 text-right text-[11px] font-bold tabular-nums text-[var(--color-text-muted)] lg:block">
                    {fmtDate(u.createdAt)}
                  </span>
                </button>

                {open && (
                  <div className="border-t border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className={LABEL}>Stable</div>
                        {u.stable.length === 0 ? (
                          <p className="mt-1.5 text-[12px] font-semibold text-[var(--color-text-muted)]">No tails.</p>
                        ) : (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {u.stable.map((c) => (
                              <span
                                key={c.handle}
                                className="rounded-md border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-[12px] font-bold text-[var(--color-text-soft)]"
                                title={c.markets ? "Market-scoped tail" : "Whole capper"}
                              >
                                @{c.handle}
                                {c.markets && <span className="text-[var(--color-text-muted)]"> · {c.markets.join(", ")}</span>}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className={LABEL}>Detail</div>
                        <dl className="mt-1.5 space-y-1 text-[12px] font-semibold text-[var(--color-text-soft)]">
                          <div className="flex gap-2">
                            <dt className="text-[var(--color-text-muted)]">Bet slip</dt>
                            <dd className="tabular-nums">
                              {u.slip.total} logged, {u.slip.pending} pending
                              {u.lastSlipAt ? `, last ${fmtDate(u.lastSlipAt)}` : ""}
                            </dd>
                          </div>
                          {u.tof && u.tof.plays > 0 && (
                            <div className="flex gap-2">
                              <dt className="text-[var(--color-text-muted)]">Tail or Fade</dt>
                              <dd className="tabular-nums">
                                {u.tof.plays} played, {u.tof.streak} day streak
                                {u.tof.lastPlayed ? `, last ${fmtDate(u.tof.lastPlayed)}` : ""}
                              </dd>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <dt className="text-[var(--color-text-muted)]">Joined</dt>
                            <dd className="tabular-nums">{u.createdAt ? fmtDate(u.createdAt) : "no roster row"}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="text-[var(--color-text-muted)]">Id</dt>
                            <dd className="font-mono text-[10px] text-[var(--color-text-muted)]">{u.userId}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
