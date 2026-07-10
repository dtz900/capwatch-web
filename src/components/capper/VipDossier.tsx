"use client";
import { useState } from "react";
import { buildEdgeView, VERDICT_WORDS, type EdgeRow } from "@/lib/edges";
import { buildEdgeCells, buildHeadlineStrip, fmtLead, fmtU, type CellTone } from "@/lib/edgeDepth";
import { MarketTailToggle } from "@/components/capper/MarketTailToggle";
import { InkCrown } from "@/components/capper/DossierReveal";

/* The VIP scout report: a cream printed dossier, deliberately off the site
   palette (same doctrine as the teal bet slip). Ink P&L colors are the
   print-legible equivalents of the site's pos/neg. */
const INK = "#17140f";
const SOFT = "#3f3a30";
const FAINT = "#7a7263";
const WIN = "#15803d";
const LOSS = "#b91c1c";
const AMBER = "#92600a";
const TICK = "#17140f";
const TRACK = "rgba(23,20,15,0.12)";
const AXIS = "rgba(23,20,15,0.35)";

const pctStr = (v: number | null) =>
  v == null ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

const toneInk = (tone: CellTone) =>
  tone === "pos" ? WIN : tone === "neg" ? LOSS : tone === "warn" ? AMBER : FAINT;

function Stamp({ tone, text }: { tone: "pos" | "neg" | "muted"; text: string }) {
  const color = tone === "pos" ? WIN : tone === "neg" ? LOSS : FAINT;
  return (
    <span
      className="inline-block shrink-0 -rotate-2 rounded border-2 px-1.5 py-px text-[9px] font-extrabold uppercase tracking-[0.14em]"
      style={{ borderColor: color, color }}
    >
      {text}
    </span>
  );
}

function BulletChart({ rows }: { rows: EdgeRow[] }) {
  const items = rows.filter((r) => r.roi_pct != null);
  const max = Math.max(...items.map((r) => Math.abs(r.roi_pct ?? 0)),
    ...items.map((r) => Math.abs(r.xroi_pct ?? 0)), 10);
  const x = (v: number) => 50 + (v / max) * 48;
  return (
    <div>
      <div className="space-y-2.5">
        {items.map(({ market, roi_pct, xroi_pct }) => {
          const roi = roi_pct as number;
          const xr = xroi_pct;
          return (
            <div key={market} className="flex items-center gap-3">
              <span className="w-20 shrink-0 truncate text-[10px] font-semibold sm:w-28 sm:text-[11px]" style={{ color: SOFT }}>
                {market}
              </span>
              <div className="relative h-4 flex-1">
                <span className="absolute top-1/2 h-px w-full -translate-y-1/2" style={{ background: TRACK }} />
                <span className="absolute inset-y-0 left-1/2 w-px" style={{ background: AXIS }} />
                <span
                  className="absolute top-1/2 h-2 -translate-y-1/2 rounded-sm"
                  style={{
                    background: roi >= 0 ? WIN : LOSS,
                    left: `${Math.min(50, x(roi))}%`,
                    width: `${Math.abs(x(roi) - 50)}%`,
                  }}
                />
                {xr != null && (
                  <span
                    className="absolute inset-y-0 w-[3px] -translate-x-1/2 rounded-full"
                    style={{ left: `${x(xr)}%`, background: TICK }}
                  />
                )}
              </div>
              <span className="hidden w-44 shrink-0 text-right text-[10px] tabular-nums sm:block" style={{ color: FAINT }}>
                <span className="font-bold" style={{ color: roi > 0 ? WIN : roi < 0 ? LOSS : FAINT }}>
                  {pctStr(roi)} actual
                </span>{" "}
                · deserved {pctStr(xr)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-[9px]" style={{ color: FAINT }}>
        <span className="w-20 shrink-0 sm:w-28" />
        <div className="flex flex-1 justify-between tabular-nums">
          <span>-{Math.round(max)}%</span>
          <span>0</span>
          <span>+{Math.round(max)}%</span>
        </div>
        <span className="hidden w-44 shrink-0 sm:block" />
      </div>
    </div>
  );
}

export function VipDossier({
  rows,
  capperId,
  handle,
  beatPct,
}: {
  rows: EdgeRow[];
  capperId: number;
  handle: string;
  beatPct: number | null;
}) {
  const [openMarket, setOpenMarket] = useState<string | null>(null);
  const strip = buildHeadlineStrip(rows);
  const views = rows
    .map((r) => ({ row: r, view: buildEdgeView(r) }))
    .sort((a, b) => b.row.n_decided - a.row.n_decided);
  const real = views.filter(
    ({ view }) => view.verdict.label === "HOLDS UP" || view.verdict.label === "ORIGINATOR"
  );
  const label = "text-[9px] font-bold uppercase tracking-[0.2em]";
  const big = "mt-1 text-[24px] leading-none font-extrabold tabular-nums";
  return (
    <section
      className="rounded-lg px-5 py-6 shadow-[0_16px_48px_rgba(0,0,0,0.55)] sm:px-7"
      style={{ background: "#f2ecdd", color: INK }}
    >
      <div className="flex items-start justify-between gap-3 border-b-2 pb-3" style={{ borderColor: "rgba(23,20,15,0.8)" }}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <InkCrown className="h-7 w-10" />
          <div>
            <div className="truncate whitespace-nowrap text-[12px] font-extrabold uppercase tracking-[0.14em] sm:text-[13px] sm:tracking-[0.22em]">
              TailSlips · Scout Report
            </div>
            <div className="truncate whitespace-nowrap text-[9px] uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.14em]" style={{ color: FAINT }}>
              Subject @{handle} · graded vs Pinnacle close · VIP
            </div>
          </div>
        </div>
        <Stamp
          tone={real.length ? "pos" : "muted"}
          text={real.length ? `${real.length} real edge${real.length === 1 ? "" : "s"}` : "no edge found"}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
        <div>
          <div className={label} style={{ color: FAINT }}>Real edges</div>
          <div className={big}>
            {real.length}
            <span className="text-[12px] font-bold" style={{ color: FAINT }}> of {rows.length}</span>
          </div>
          <div className="mt-0.5 text-[10px]" style={{ color: SOFT }}>
            {real.length ? real.map((r) => r.view.label).join(" · ") : "nothing holds up vs the close yet"}
          </div>
        </div>
        <div>
          <div className={label} style={{ color: FAINT }}>Skill vs. luck</div>
          {strip.luck ? (
            <>
              <div className={big} style={{ color: strip.luck.net >= 0 ? WIN : LOSS }}>
                {fmtU(strip.luck.net)}
              </div>
              <div className="mt-0.5 text-[10px]" style={{ color: SOFT }}>
                deserved {fmtU(strip.luck.expected)} · ran {strip.luck.delta >= 0 ? "hot" : "cold"}{" "}
                {Math.abs(strip.luck.delta).toFixed(1)}u
              </div>
            </>
          ) : (
            <div className={big} style={{ color: FAINT }}>n/a</div>
          )}
        </div>
        <div>
          <div className={label} style={{ color: FAINT }}>Price honesty</div>
          {strip.honesty ? (
            <>
              <div className={big} style={{ color: strip.honesty.flagged ? AMBER : INK }}>
                {strip.honesty.avgCents > 0 ? "+" : ""}
                {Math.round(strip.honesty.avgCents)}c
              </div>
              <div className="mt-0.5 text-[10px]" style={{ color: SOFT }}>
                vs close · {strip.honesty.n} priced{strip.honesty.flagged ? " · hard to match" : ""}
                {beatPct != null ? ` · beats close ${Math.round(beatPct * 100)}%` : ""}
              </div>
            </>
          ) : (
            <>
              <div className={big} style={{ color: FAINT }}>n/a</div>
              <div className="mt-0.5 text-[10px]" style={{ color: FAINT }}>
                too few posted prices to judge
              </div>
            </>
          )}
        </div>
        <div>
          <div className={label} style={{ color: FAINT }}>Tailability</div>
          {strip.lead ? (
            <>
              <div className={big} style={{ color: strip.lead.warn ? AMBER : INK }}>
                {fmtLead(strip.lead.minutes)}
              </div>
              <div className="mt-0.5 text-[10px]" style={{ color: SOFT }}>typical post to first pitch</div>
            </>
          ) : (
            <div className={big} style={{ color: FAINT }}>n/a</div>
          )}
        </div>
      </div>
      <div className="mt-4 border-t border-dashed pt-4" style={{ borderColor: "rgba(23,20,15,0.3)" }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-y-1">
          <span className={label} style={{ color: FAINT }}>Deserved vs. actual</span>
          <span className="w-full text-[10px] font-semibold sm:w-auto" style={{ color: SOFT }}>
            bar = actual ROI · ink tick = deserved by close
          </span>
        </div>
        <BulletChart rows={rows} />
      </div>
      <div className="mt-4 border-t border-dashed pt-2" style={{ borderColor: "rgba(23,20,15,0.3)" }}>
        {views.map(({ row, view: f }) => {
          const open = openMarket === row.market;
          const cells = buildEdgeCells(row);
          return (
            <div
              key={row.market}
              className="border-b py-2.5 last:border-0"
              style={{ borderColor: "rgba(23,20,15,0.08)" }}
            >
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-2.5 sm:gap-x-5">
                <button
                  onClick={() => setOpenMarket(open ? null : row.market)}
                  aria-expanded={open}
                  aria-label={`Details for ${f.label}`}
                  className="inline-flex items-baseline gap-1.5 text-left"
                >
                  <span
                    className={`text-[9px] transition-transform ${open ? "rotate-90" : ""}`}
                    style={{ color: FAINT }}
                    aria-hidden="true"
                  >
                    {"▸"}
                  </span>
                  <span className="truncate text-sm font-bold">{f.label}</span>
                  <span className="text-[10px] font-semibold tabular-nums" style={{ color: FAINT }}>
                    {row.n_decided}
                  </span>
                </button>
                <span
                  className="text-right text-[13px] font-extrabold tabular-nums"
                  style={{ color: (row.roi_pct ?? 0) > 0 ? WIN : (row.roi_pct ?? 0) < 0 ? LOSS : FAINT }}
                >
                  {pctStr(row.roi_pct)}
                </span>
                <Stamp tone={f.verdict.tone} text={VERDICT_WORDS[f.verdict.label] ?? f.verdict.label.toLowerCase()} />
                <span className="w-14 text-right">
                  <MarketTailToggle capperId={capperId} market={row.market} ink />
                </span>
              </div>
              {open && (
                <div className="mt-2.5 rounded border border-dashed px-3.5 py-3" style={{ borderColor: "rgba(23,20,15,0.3)" }}>
                  <p className="text-xs leading-relaxed" style={{ color: SOFT }}>
                    {f.sentence}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
                    {(
                      [
                        ["Luck", cells.luck],
                        ["30d trend", cells.trend],
                        ["Close", cells.close],
                        ["Timing", cells.timing],
                      ] as const
                    ).map(([cellLabel, cell]) => (
                      <div key={cellLabel}>
                        <div className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: FAINT }}>
                          {cellLabel}
                        </div>
                        <div
                          className="mt-0.5 text-[13px] font-extrabold tabular-nums leading-tight"
                          style={{ color: cell.tone === "muted" ? INK : toneInk(cell.tone) }}
                        >
                          {cell.value}
                        </div>
                        <div className="mt-0.5 text-[10px] leading-snug" style={{ color: FAINT }}>
                          {cell.sub}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div
        className="mt-4 flex items-center justify-between border-t-2 pt-2 text-[9px] uppercase tracking-[0.14em]"
        style={{ borderColor: "rgba(23,20,15,0.8)", color: FAINT }}
      >
        <span>TailSlips edge intelligence · not betting advice · 21+</span>
        <span>form no. TS-2026-VIP</span>
      </div>
    </section>
  );
}
