import Image from "next/image";
import { notFound } from "next/navigation";
import { DossierReveal } from "./DossierReveal";
import { TopNav } from "@/components/nav/TopNav";
import { createServerSupabase } from "@/lib/supabase/server";
import { vipEnabled } from "@/lib/flags";
import { buildEdgeView, VERDICT_WORDS, type EdgeRow } from "@/lib/edges";
import { buildHeadlineStrip, fmtLead, fmtU } from "@/lib/edgeDepth";

/* DESIGN LAB, local review only. Two full-identity takes on the VIP
   section rendered with live data. Not linked from anywhere; delete
   before merge. */

export const dynamic = "force-dynamic";
export const metadata = { title: "VIP Lab | TailSlips" };

const HANDLE_IDS: Record<string, number> = { tonestakes: 69, robdfb: 50, sbr_bets: 2 };

const SELECT =
  "market,n_decided,roi_pct,xroi_pct,clv_beat_pct,clv_avg_cents,clv_n,tracked_days,gate_pass,gate_reasons,originator,tail_at_close_roi,pnl_units,x_actual_pnl_units,x_pnl_units,x_n,roi_30d,xroi_30d,n_30d,x_n_30d,median_lead_minutes";

const pctStr = (v: number | null) =>
  v == null ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

function InkCrown({ className, color = "#143024" }: { className?: string; color?: string }) {
  const mask: React.CSSProperties = {
    backgroundColor: color,
    WebkitMaskImage: "url(/logo-crown.png)",
    maskImage: "url(/logo-crown.png)",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };
  return <span aria-hidden="true" className={`inline-block ${className ?? ""}`} style={mask} />;
}

function views(rows: EdgeRow[]) {
  return rows
    .map((r) => ({ row: r, view: buildEdgeView(r) }))
    .sort((a, b) => b.row.n_decided - a.row.n_decided);
}

interface Palette {
  tick: string; // deserved-by-close marker
  win: string;
  loss: string;
  ink: string;
  soft: string;
  faint: string;
  track: string;
  axis: string;
}

/* Bullet chart: a solid bar from zero to actual ROI, an ink tick where the
   closing line says the record deserved to land. Bar past the tick = hot. */
function BulletChart({ rows, p }: { rows: EdgeRow[]; p: Palette }) {
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
              <span className="w-28 shrink-0 truncate text-[11px] font-semibold" style={{ color: p.soft }}>
                {market}
              </span>
              <div className="relative h-4 flex-1">
                <span className="absolute top-1/2 h-px w-full -translate-y-1/2" style={{ background: p.track }} />
                <span className="absolute inset-y-0 left-1/2 w-px" style={{ background: p.axis }} />
                <span
                  className="absolute top-1/2 h-2 -translate-y-1/2 rounded-sm"
                  style={{
                    background: roi >= 0 ? p.win : p.loss,
                    left: `${Math.min(50, x(roi))}%`,
                    width: `${Math.abs(x(roi) - 50)}%`,
                  }}
                />
                {xr != null && (
                  <span
                    className="absolute inset-y-0 w-[3px] -translate-x-1/2 rounded-full"
                    style={{ left: `${x(xr)}%`, background: p.tick }}
                  />
                )}
              </div>
              <span className="w-44 shrink-0 text-right text-[10px] tabular-nums" style={{ color: p.faint }}>
                <span className="font-bold" style={{ color: roi > 0 ? p.win : roi < 0 ? p.loss : p.faint }}>
                  {pctStr(roi)} actual
                </span>{" "}
                · deserved {pctStr(xr)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-[9px]" style={{ color: p.faint }}>
        <span className="w-28 shrink-0" />
        <div className="flex flex-1 justify-between tabular-nums">
          <span>-{Math.round(max)}%</span>
          <span>0</span>
          <span>+{Math.round(max)}%</span>
        </div>
        <span className="w-44 shrink-0" />
      </div>
    </div>
  );
}

/* ---------- Identity 1: Teal Terminal ---------- */

const TEAL: Palette = {
  tick: "#2fd9c0",
  win: "var(--color-pos)",
  loss: "var(--color-neg)",
  ink: "#f7f3e9",
  soft: "#cfe8e0",
  faint: "#6da399",
  track: "rgba(47,217,192,0.14)",
  axis: "rgba(47,217,192,0.35)",
};

function TealSection({ rows, handle }: { rows: EdgeRow[]; handle: string }) {
  const strip = buildHeadlineStrip(rows);
  const real = views(rows).filter(
    ({ view }) => view.verdict.label === "HOLDS UP" || view.verdict.label === "ORIGINATOR"
  );
  const kpi = "rounded-lg bg-[rgba(4,22,18,0.65)] ring-1 ring-[rgba(47,217,192,0.16)] px-4 py-3";
  const label = "text-[9px] font-bold uppercase tracking-[0.2em] text-[#4c7d72]";
  const big = "mt-1.5 text-[24px] leading-none font-extrabold tabular-nums";
  const pill = (tone: "pos" | "neg" | "muted", text: string) => (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] ${
        tone === "pos"
          ? "bg-[var(--color-pos-soft)] text-[var(--color-pos)]"
          : tone === "neg"
            ? "bg-[var(--color-neg-soft)] text-[var(--color-neg)]"
            : "bg-[rgba(47,217,192,0.1)] text-[#6da399]"
      }`}
    >
      {text}
    </span>
  );
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#0e352e] via-[#09231e] to-[#051713] ring-1 ring-[rgba(47,217,192,0.28)] shadow-[0_12px_48px_rgba(10,60,50,0.45)] px-6 py-5">
      <Image
        src="/logo-crown.png"
        alt=""
        width={1135}
        height={793}
        className="pointer-events-none absolute -right-10 -top-14 w-64 opacity-[0.05]"
      />
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Image src="/logo-crown.png" alt="" width={1135} height={793} className="h-4 w-auto" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#2fd9c0]">
              Edge Intelligence
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-[#6da399]">
            Every market graded against the Pinnacle close. Beat the number and it is skill; win
            without it and it is luck.
          </p>
        </div>
        <div className="flex rounded-lg bg-[rgba(4,22,18,0.8)] p-0.5 text-[10px] font-bold ring-1 ring-[rgba(47,217,192,0.14)]">
          <span className="rounded-md bg-[rgba(47,217,192,0.15)] px-2.5 py-1 text-[#2fd9c0]">Season</span>
          <span className="px-2.5 py-1 text-[#4c7d72]">30d</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className={kpi}>
          <div className={label}>Real edges</div>
          <div className={`${big} text-[#f7f3e9]`}>
            {real.length}
            <span className="text-[12px] font-bold text-[#4c7d72]"> of {rows.length}</span>
          </div>
          <div className="mt-1 text-[10px] text-[#6da399]">
            {real.length ? real.map((r) => r.view.label).join(" · ") : "nothing holds up yet"}
          </div>
        </div>
        <div className={kpi}>
          <div className={label}>Skill vs. luck</div>
          {strip.luck ? (
            <>
              <div className={`${big} ${strip.luck.net >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}`}>
                {fmtU(strip.luck.net)}
              </div>
              <div className="mt-1 text-[10px] text-[#6da399]">
                deserved <span className="text-[#2fd9c0]">{fmtU(strip.luck.expected)}</span> · ran{" "}
                {strip.luck.delta >= 0 ? "hot" : "cold"} {Math.abs(strip.luck.delta).toFixed(1)}u
              </div>
            </>
          ) : (
            <div className={`${big} text-[#4c7d72]`}>n/a</div>
          )}
        </div>
        <div className={kpi}>
          <div className={label}>Price honesty</div>
          {strip.honesty ? (
            <>
              <div className={`${big} text-[#f7f3e9]`}>
                {strip.honesty.avgCents > 0 ? "+" : ""}
                {Math.round(strip.honesty.avgCents)}c
              </div>
              <div className="mt-1 text-[10px] text-[#6da399]">
                vs close · {strip.honesty.n} priced{strip.honesty.flagged ? " · hard to match" : ""}
              </div>
            </>
          ) : (
            <div className={`${big} text-[#4c7d72]`}>n/a</div>
          )}
        </div>
        <div className={kpi}>
          <div className={label}>Tailability</div>
          {strip.lead ? (
            <>
              <div className={`${big} text-[#f7f3e9]`}>{fmtLead(strip.lead.minutes)}</div>
              <div className="mt-1 text-[10px] text-[#6da399]">typical post to first pitch</div>
            </>
          ) : (
            <div className={`${big} text-[#4c7d72]`}>n/a</div>
          )}
        </div>
      </div>
      <div className="mt-2 rounded-lg bg-[rgba(4,22,18,0.65)] ring-1 ring-[rgba(47,217,192,0.16)] px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className={label}>Deserved vs. actual</span>
          <span className="text-[9px] text-[#6da399]">bar = actual ROI · tick = deserved by close</span>
        </div>
        <BulletChart rows={rows} p={TEAL} />
      </div>
      <div className="mt-2 divide-y divide-[rgba(47,217,192,0.08)] rounded-lg bg-[rgba(4,22,18,0.65)] ring-1 ring-[rgba(47,217,192,0.16)] px-5">
        {views(rows).map(({ row, view: f }) => (
          <div key={row.market} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-5 py-2.5">
            <span className="text-sm font-semibold text-[#f7f3e9]">
              {f.label}
              <span className="ml-2 text-[10px] tabular-nums text-[#4c7d72]">{row.n_decided}</span>
            </span>
            <span className="text-right text-[13px] font-bold tabular-nums text-[#cfe8e0]">
              {pctStr(row.roi_pct)}
            </span>
            {pill(f.verdict.tone, VERDICT_WORDS[f.verdict.label] ?? f.verdict.label.toLowerCase())}
            <span className="w-12 text-right text-[10px] font-bold tracking-[0.12em] text-[#2fd9c0]">TAIL</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Identity 2: Paper Dossier ---------- */

const PAPER: Palette = {
  tick: "#17140f",
  win: "#15803d",
  loss: "#b91c1c",
  ink: "#17140f",
  soft: "#3f3a30",
  faint: "#7a7263",
  track: "rgba(23,20,15,0.12)",
  axis: "rgba(23,20,15,0.35)",
};

function Stamp({ tone, text }: { tone: "pos" | "neg" | "muted"; text: string }) {
  const color = tone === "pos" ? PAPER.win : tone === "neg" ? PAPER.loss : PAPER.faint;
  return (
    <span
      className="inline-block shrink-0 -rotate-2 rounded border-2 px-1.5 py-px text-[9px] font-extrabold uppercase tracking-[0.14em]"
      style={{ borderColor: color, color }}
    >
      {text}
    </span>
  );
}

function PaperSection({ rows, handle }: { rows: EdgeRow[]; handle: string }) {
  const strip = buildHeadlineStrip(rows);
  const real = views(rows).filter(
    ({ view }) => view.verdict.label === "HOLDS UP" || view.verdict.label === "ORIGINATOR"
  );
  const label = "text-[9px] font-bold uppercase tracking-[0.2em]";
  const big = "mt-1 text-[24px] leading-none font-extrabold tabular-nums";
  return (
    <section
      className="rounded-lg px-7 py-6 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
      style={{ background: "#f2ecdd", color: PAPER.ink }}
    >
      <div className="flex items-start justify-between border-b-2 border-[rgba(23,20,15,0.8)] pb-3">
        <div className="flex items-center gap-2.5">
          <InkCrown className="h-7 w-10" />
          <div>
            <div className="text-[13px] font-extrabold uppercase tracking-[0.22em]">
              TailSlips · Scout Report
            </div>
            <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: PAPER.faint }}>
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
          <div className={label} style={{ color: PAPER.faint }}>Real edges</div>
          <div className={big}>
            {real.length}
            <span className="text-[12px] font-bold" style={{ color: PAPER.faint }}> of {rows.length}</span>
          </div>
          <div className="mt-0.5 text-[10px]" style={{ color: PAPER.soft }}>
            {real.length ? real.map((r) => r.view.label).join(" · ") : "keep scrolling"}
          </div>
        </div>
        <div>
          <div className={label} style={{ color: PAPER.faint }}>Skill vs. luck</div>
          {strip.luck ? (
            <>
              <div className={big} style={{ color: strip.luck.net >= 0 ? PAPER.win : PAPER.loss }}>
                {fmtU(strip.luck.net)}
              </div>
              <div className="mt-0.5 text-[10px]" style={{ color: PAPER.soft }}>
                deserved {fmtU(strip.luck.expected)} · ran {strip.luck.delta >= 0 ? "hot" : "cold"}{" "}
                {Math.abs(strip.luck.delta).toFixed(1)}u
              </div>
            </>
          ) : (
            <div className={big} style={{ color: PAPER.faint }}>n/a</div>
          )}
        </div>
        <div>
          <div className={label} style={{ color: PAPER.faint }}>Price honesty</div>
          {strip.honesty ? (
            <>
              <div className={big}>
                {strip.honesty.avgCents > 0 ? "+" : ""}
                {Math.round(strip.honesty.avgCents)}c
              </div>
              <div className="mt-0.5 text-[10px]" style={{ color: PAPER.soft }}>
                vs close · {strip.honesty.n} priced{strip.honesty.flagged ? " · hard to match" : ""}
              </div>
            </>
          ) : (
            <div className={big} style={{ color: PAPER.faint }}>n/a</div>
          )}
        </div>
        <div>
          <div className={label} style={{ color: PAPER.faint }}>Tailability</div>
          {strip.lead ? (
            <>
              <div className={big}>{fmtLead(strip.lead.minutes)}</div>
              <div className="mt-0.5 text-[10px]" style={{ color: PAPER.soft }}>
                typical post to first pitch
              </div>
            </>
          ) : (
            <div className={big} style={{ color: PAPER.faint }}>n/a</div>
          )}
        </div>
      </div>
      <div className="mt-4 border-t border-dashed border-[rgba(23,20,15,0.3)] pt-4">
        <div className="mb-3 flex items-center justify-between">
          <span className={label} style={{ color: PAPER.faint }}>Deserved vs. actual</span>
          <span className="text-[9px]" style={{ color: PAPER.faint }}>bar = actual ROI · ink tick = deserved by close</span>
        </div>
        <BulletChart rows={rows} p={PAPER} />
      </div>
      <div className="mt-4 border-t border-dashed border-[rgba(23,20,15,0.3)] pt-2">
        {views(rows).map(({ row, view: f }) => (
          <div
            key={row.market}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-5 border-b border-[rgba(23,20,15,0.08)] py-2.5 last:border-0"
          >
            <span className="text-sm font-bold">
              {f.label}
              <span className="ml-2 text-[10px] font-semibold tabular-nums" style={{ color: PAPER.faint }}>
                {row.n_decided}
              </span>
            </span>
            <span
              className="text-right text-[13px] font-extrabold tabular-nums"
              style={{ color: (row.roi_pct ?? 0) > 0 ? PAPER.win : (row.roi_pct ?? 0) < 0 ? PAPER.loss : PAPER.faint }}
            >
              {pctStr(row.roi_pct)}
            </span>
            <Stamp tone={f.verdict.tone} text={VERDICT_WORDS[f.verdict.label] ?? f.verdict.label.toLowerCase()} />
            <span className="w-12 text-right text-[10px] font-extrabold uppercase tracking-[0.12em] underline underline-offset-2">
              Tail
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t-2 border-[rgba(23,20,15,0.8)] pt-2 text-[9px] uppercase tracking-[0.14em]" style={{ color: PAPER.faint }}>
        <span>TailSlips edge intelligence · not betting advice · 21+</span>
        <span>form no. TS-{new Date().getFullYear()}-VIP</span>
      </div>
    </section>
  );
}

/* ---------- Page ---------- */

export default async function VipLabPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>;
}) {
  if (!vipEnabled()) notFound();
  const { handle: rawHandle } = await searchParams;
  const handle = rawHandle && HANDLE_IDS[rawHandle] ? rawHandle : "tonestakes";
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("capper_market_edges")
    .select(SELECT)
    .eq("capper_id", HANDLE_IDS[handle])
    .order("n_decided", { ascending: false });
  const rows = (data ?? []) as EdgeRow[];

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[1240px] space-y-10 px-4 py-10 sm:px-7">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">VIP Design Lab v2</h1>
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">
            Two full identities, live data for @{handle}. Swap with ?handle=robdfb or
            ?handle=sbr_bets. {rows.length === 0 && "No rows: sign in as VIP."}
          </p>
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Identity 1 · Teal Terminal (bet slip family)
          </h2>
          <TealSection rows={rows} handle={handle} />
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Identity 2 · Paper Dossier (click the file to open it)
          </h2>
          <DossierReveal handle={handle}>
            <PaperSection rows={rows} handle={handle} />
          </DossierReveal>
        </div>
      </main>
    </>
  );
}
