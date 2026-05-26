import { fetchResearch, type ResearchMode, type ResearchWindow } from "@/lib/api";
import { formatRoi, formatUnitsSmart, formatHandle } from "@/lib/formatters";
import { SearchForm } from "./SearchForm";
import { CopySnippetButton } from "./CopySnippetButton";
import { buildSnippet } from "./_snippet";

export const metadata = {
  title: "Research · TailSlips Admin",
  robots: { index: false, follow: false },
};

const WINDOWS: ResearchWindow[] = ["L7", "L30", "season", "all"];
const MODES: ResearchMode[] = ["player", "team"];

const WINDOW_BLURB: Record<ResearchWindow, string> = {
  L7: "Last 7 days",
  L30: "Last 30 days",
  season: "This season",
  all: "All-time",
};

interface PageProps {
  searchParams: Promise<{ q?: string; mode?: string; window?: string }>;
}

function recordStr(wins: number, losses: number, pushes: number): string {
  return pushes > 0 ? `${wins}-${losses}-${pushes}` : `${wins}-${losses}`;
}

function parseMode(v: string | undefined): ResearchMode {
  return MODES.includes(v as ResearchMode) ? (v as ResearchMode) : "player";
}
function parseWindow(v: string | undefined): ResearchWindow {
  return WINDOWS.includes(v as ResearchWindow) ? (v as ResearchWindow) : "L30";
}

function fmtPosted(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtOdds(o: number | null): string {
  if (o == null) return "";
  return o > 0 ? `+${o}` : String(o);
}

function fmtSelection(r: {
  selection: string | null;
  player_name: string | null;
  line: number | null;
  direction: string | null;
  stat_name: string | null;
}): string {
  // Render the bet itself in a tweet-friendly way. Prefer the raw selection
  // string when we have one (covers all v1 rows); fall back to a v2
  // reconstruction (player + direction + line + stat) when selection is null.
  if (r.selection && r.selection.trim()) return r.selection.trim();
  const parts: string[] = [];
  if (r.player_name) parts.push(r.player_name);
  if (r.direction) parts.push(r.direction[0].toUpperCase() + r.direction.slice(1));
  if (r.line != null) parts.push(String(r.line));
  if (r.stat_name) parts.push(r.stat_name.replace(/_/g, " "));
  return parts.join(" ");
}

export default async function AdminResearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const mode = parseMode(sp.mode);
  const windowVal = parseWindow(sp.window);

  let data: Awaited<ReturnType<typeof fetchResearch>> | null = null;
  let error: string | null = null;
  if (q) {
    try {
      data = await fetchResearch(mode, q, windowVal, 10);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const snippet = data ? buildSnippet(data) : "";

  return (
    <main className="max-w-[1080px] mx-auto px-7 pb-16">
      <header className="pt-10 pb-6">
        <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-bold mb-2">
          Admin · research
        </div>
        <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none">
          Player / team lookup
        </h1>
        <p className="text-[13px] text-[var(--color-text-soft)] font-medium mt-2">
          Type a player or team name. Get the tracked-sharp aggregate + per-capper breakdown formatted for a 60-second X reply.
        </p>
      </header>

      <section className="rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] p-5 mb-8">
        <SearchForm initialQ={q} initialMode={mode} initialWindow={windowVal} />
      </section>

      {error && (
        <section className="rounded-lg border border-[rgba(255,99,99,0.30)] bg-[rgba(255,99,99,0.06)] p-4 mb-6">
          <div className="text-[11px] uppercase tracking-[0.15em] text-[#ff8a8a] font-extrabold mb-1">
            Error
          </div>
          <div className="text-[13px] text-[var(--color-text)]">{error}</div>
        </section>
      )}

      {!q && !error && (
        <p className="text-[13px] text-[var(--color-text-muted)]">
          Enter a search above. Player mode matches on player_name + selection text; team mode matches game/team bets by selection text.
        </p>
      )}

      {data && data.totals.picks === 0 && (
        <section className="rounded-lg border border-[rgba(255,255,255,0.06)] p-6 text-center">
          <div className="text-[13px] text-[var(--color-text-muted)]">
            No graded sharp picks found for <span className="font-bold text-[var(--color-text)]">{data.subject}</span> in window <span className="font-bold text-[var(--color-text)]">{WINDOW_BLURB[data.window]}</span>.
          </div>
        </section>
      )}

      {data && data.totals.picks > 0 && (
        <div className="space-y-8">
          {/* Headline aggregate */}
          <section className="rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
            <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-bold mb-2">
              {mode === "player" ? "Player" : "Team"} · {WINDOW_BLURB[data.window]}
            </div>
            <div className="text-[26px] font-extrabold tracking-[-0.01em] mb-4">
              {data.subject}
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <Stat label="Record" value={recordStr(data.totals.wins, data.totals.losses, data.totals.pushes)} />
              <Stat label="Units" value={formatUnitsSmart(data.totals.units) + "u"} accent={data.totals.units} />
              <Stat label="ROI" value={formatRoi(data.totals.roi_pct)} accent={data.totals.roi_pct} />
              <Stat label="Picks" value={String(data.totals.picks)} />
            </div>
          </section>

          {/* Per-capper breakdown */}
          <section>
            <h2 className="text-[11px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-extrabold mb-3">
              Per capper
            </h2>
            <div className="rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[rgba(255,255,255,0.03)] text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                  <tr>
                    <th className="text-left px-4 py-2 font-bold">Handle</th>
                    <th className="text-right px-4 py-2 font-bold">Record</th>
                    <th className="text-right px-4 py-2 font-bold">Units</th>
                    <th className="text-right px-4 py-2 font-bold">ROI</th>
                    <th className="text-right px-4 py-2 font-bold">Picks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_capper.map((c) => (
                    <tr
                      key={c.capper_id}
                      className="border-t border-[rgba(255,255,255,0.05)]"
                    >
                      <td className="px-4 py-2 font-bold">
                        {c.handle ? formatHandle(c.handle) : `capper#${c.capper_id}`}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {recordStr(c.wins, c.losses, c.pushes)}
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums font-bold ${unitsClass(c.units)}`}>
                        {formatUnitsSmart(c.units)}u
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums ${unitsClass(c.roi_pct)}`}>
                        {formatRoi(c.roi_pct)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-[var(--color-text-muted)]">
                        {c.picks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent picks */}
          <section>
            <h2 className="text-[11px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-extrabold mb-3">
              Recent picks
            </h2>
            <div className="rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[rgba(255,255,255,0.03)] text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                  <tr>
                    <th className="text-left px-4 py-2 font-bold">Date</th>
                    <th className="text-left px-4 py-2 font-bold">Handle</th>
                    <th className="text-left px-4 py-2 font-bold">Selection</th>
                    <th className="text-right px-4 py-2 font-bold">Odds</th>
                    <th className="text-center px-4 py-2 font-bold">Result</th>
                    <th className="text-right px-4 py-2 font-bold">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r, i) => (
                    <tr
                      key={`${r.posted_at}-${i}`}
                      className="border-t border-[rgba(255,255,255,0.05)]"
                    >
                      <td className="px-4 py-2 text-[var(--color-text-muted)] whitespace-nowrap">
                        {fmtPosted(r.posted_at)}
                      </td>
                      <td className="px-4 py-2 font-bold whitespace-nowrap">
                        {r.handle ? formatHandle(r.handle) : ""}
                      </td>
                      <td className="px-4 py-2">{fmtSelection(r)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtOdds(r.odds_taken)}</td>
                      <td className={`px-4 py-2 text-center font-bold uppercase text-[11px] tracking-[0.10em] ${outcomeClass(r.outcome)}`}>
                        {r.outcome}
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums font-bold ${unitsClass(r.profit_units)}`}>
                        {formatUnitsSmart(r.profit_units)}u
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Snippet + copy */}
          <section className="rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-[11px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-extrabold">
                Reply snippet
              </h2>
              <CopySnippetButton text={snippet} />
            </div>
            <pre className="whitespace-pre-wrap font-mono text-[13px] text-[var(--color-text)] bg-[rgba(0,0,0,0.30)] rounded p-3 border border-[rgba(255,255,255,0.04)]">
              {snippet}
            </pre>
          </section>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: number }) {
  const cls =
    accent === undefined
      ? "text-[var(--color-text)]"
      : accent > 0
        ? "text-[#4ade80]"
        : accent < 0
          ? "text-[#f87171]"
          : "text-[var(--color-text)]";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)] font-bold mb-1">
        {label}
      </div>
      <div className={`text-[22px] font-extrabold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function unitsClass(n: number): string {
  if (n > 0) return "text-[#4ade80]";
  if (n < 0) return "text-[#f87171]";
  return "text-[var(--color-text-muted)]";
}

function outcomeClass(o: "win" | "loss" | "push"): string {
  if (o === "win") return "text-[#4ade80]";
  if (o === "loss") return "text-[#f87171]";
  return "text-[var(--color-text-muted)]";
}
