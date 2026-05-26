import {
  fetchResearch,
  type ResearchCut,
  type ResearchMode,
  type ResearchStatRow,
  type ResearchWindow,
  type TeamCut,
} from "@/lib/api";
import { formatRoi, formatUnitsSmart, formatHandle } from "@/lib/formatters";
import { SearchForm } from "./SearchForm";
import { CopySnippetButton } from "./CopySnippetButton";
import {
  buildPlayerSnippet,
  buildPlayerStatSnippet,
  buildTeamCutSnippet,
  buildTeamSummarySnippet,
} from "./_snippet";

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

function fmtUnitsCell(n: number | null, priced: number = 1): string {
  // Page-level units renderer that respects "no posted odds = no units".
  // priced is the bucket's priced_picks count; if zero, the bucket itself
  // contributed no priced legs and we show a dash instead of "+0.00u".
  if (n === null || priced === 0) return "n/a"; // explicit "no posted odds" rather than misleading 0u
  return formatUnitsSmart(n) + "u";
}

function fmtRoiCell(pct: number, priced: number): string {
  if (priced === 0) return "n/a";
  return formatRoi(pct);
}

function fmtWinRateCell(rate: number, decided: number): string {
  // decided = picks - pushes. Below 3 the percentage swings on a single
  // result and shouldn't be shown as if it were a meaningful number.
  if (decided < 3) return "n/a";
  return `${Math.round(rate * 100)}%`;
}

function winRateAccent(rate: number): number {
  // Returns a signed magnitude relative to 50% so the Stat accent helper
  // can color it green/red. Above 50% = green, below = red, near 50% =
  // neutral white.
  return (rate - 0.5) * 100;
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

  const overallSnippet = data
    ? data.mode === "team"
      ? buildTeamSummarySnippet(data)
      : buildPlayerSnippet(data)
    : "";

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
              <Stat
                label="Win rate"
                value={fmtWinRateCell(data.totals.win_rate, data.totals.picks - data.totals.pushes)}
                accent={data.totals.picks - data.totals.pushes >= 3 ? winRateAccent(data.totals.win_rate) : undefined}
              />
              <Stat
                label="Units"
                value={fmtUnitsCell(data.totals.units, data.totals.priced_picks)}
                accent={data.totals.priced_picks > 0 ? data.totals.units : undefined}
              />
              <Stat
                label="ROI"
                value={fmtRoiCell(data.totals.roi_pct, data.totals.priced_picks)}
                accent={data.totals.priced_picks > 0 ? data.totals.roi_pct : undefined}
              />
              <Stat label="Picks" value={String(data.totals.picks)} />
              {data.totals.priced_picks < data.totals.picks && (
                <Stat
                  label="Tailable"
                  value={`${data.totals.priced_picks}/${data.totals.picks}`}
                />
              )}
            </div>
            {data.totals.priced_picks < data.totals.picks && (
              <div className="text-[11px] text-[var(--color-text-muted)] mt-3">
                Units + ROI use 1u flat per leg from odds, limited to picks priced inside the tailable band (-2000 to +800). The {data.totals.picks - data.totals.priced_picks} excluded legs (no odds, or alt-line longshots) count toward the record but not the money math.
              </div>
            )}
            {mode === "team" && data.resolved_abbrev === null && (
              <div className="text-[11px] text-[#ffba6a] mt-3">
                Team name did not resolve to an MLB abbreviation, so cuts below cannot split out backing vs fading vs totals. Try the team&apos;s canonical name (e.g. &quot;Astros&quot; instead of a misspelling) for the split view.
              </div>
            )}
          </section>

          {/* Team-mode cuts: Backing, Fading, Totals, etc. */}
          {mode === "team" && data.cuts.length > 0 && (
            <>
              {data.cuts.map((cut) => (
                <CutSection key={cut.cut} cut={cut} cutSnippet={buildTeamCutSnippet(data, cut)} />
              ))}
            </>
          )}

          {/* Per-stat breakdown (player mode only) */}
          {mode === "player" && data.by_stat.length > 0 && (
            <section>
              <h2 className="text-[11px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-extrabold mb-3">
                Per market
              </h2>
              <div className="space-y-3">
                {data.by_stat.map((s) => (
                  <StatBlock
                    key={s.stat_name ?? "__other__"}
                    stat={s}
                    snippet={buildPlayerStatSnippet(data, s)}
                  />
                ))}
              </div>
              {/* Legacy compact summary table for quick scanning. Kept as
                  a footer beneath the expanded blocks so a glance still
                  shows the full market list at one density. */}
              <div className="mt-4 rounded-md border border-[rgba(255,255,255,0.05)] overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead className="bg-[rgba(255,255,255,0.02)] text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-bold">Summary</th>
                      <th className="text-right px-3 py-1.5 font-bold">Record</th>
                      <th className="text-right px-3 py-1.5 font-bold">Win rate</th>
                      <th className="text-right px-3 py-1.5 font-bold">Units</th>
                      <th className="text-right px-3 py-1.5 font-bold">ROI</th>
                      <th className="text-right px-3 py-1.5 font-bold">Picks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_stat.map((s) => (
                      <tr
                        key={s.stat_name ?? "__other__"}
                        className="border-t border-[rgba(255,255,255,0.04)]"
                      >
                        <td className="px-3 py-1.5 font-bold">{s.label}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {recordStr(s.wins, s.losses, s.pushes)}
                        </td>
                        <td className={`px-3 py-1.5 text-right tabular-nums font-bold ${winRateClass(s.win_rate, s.picks - s.pushes)}`}>
                          {fmtWinRateCell(s.win_rate, s.picks - s.pushes)}
                        </td>
                        <td className={`px-3 py-1.5 text-right tabular-nums font-bold ${unitsClass(s.priced_picks > 0 ? s.units : 0)}`}>
                          {fmtUnitsCell(s.units, s.priced_picks)}
                        </td>
                        <td className={`px-3 py-1.5 text-right tabular-nums ${unitsClass(s.priced_picks > 0 ? s.roi_pct : 0)}`}>
                          {fmtRoiCell(s.roi_pct, s.priced_picks)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-[var(--color-text-muted)]">
                          {s.picks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

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
                    <th className="text-right px-4 py-2 font-bold">Win rate</th>
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
                      <td className={`px-4 py-2 text-right tabular-nums font-bold ${winRateClass(c.win_rate, c.picks - c.pushes)}`}>
                        {fmtWinRateCell(c.win_rate, c.picks - c.pushes)}
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums font-bold ${unitsClass(c.priced_picks > 0 ? c.units : 0)}`}>
                        {fmtUnitsCell(c.units, c.priced_picks)}
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums ${unitsClass(c.priced_picks > 0 ? c.roi_pct : 0)}`}>
                        {fmtRoiCell(c.roi_pct, c.priced_picks)}
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
                    {mode === "team" && (
                      <th className="text-left px-4 py-2 font-bold">Cut</th>
                    )}
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
                      {mode === "team" && (
                        <td className="px-4 py-2 text-[11px] uppercase tracking-[0.10em] text-[var(--color-text-muted)] whitespace-nowrap">
                          {r.cut ? CUT_SHORT_LABEL[r.cut] : ""}
                        </td>
                      )}
                      <td className="px-4 py-2 text-right tabular-nums">{fmtOdds(r.odds_taken)}</td>
                      <td className={`px-4 py-2 text-center font-bold uppercase text-[11px] tracking-[0.10em] ${outcomeClass(r.outcome)}`}>
                        {r.outcome}
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums font-bold ${unitsClass(r.units_synth ?? 0)}`}>
                        {fmtUnitsCell(r.units_synth, r.units_synth !== null ? 1 : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Overall snippet + copy */}
          <section className="rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-[11px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-extrabold">
                Reply snippet · summary
              </h2>
              <CopySnippetButton text={overallSnippet} />
            </div>
            <pre className="whitespace-pre-wrap font-mono text-[13px] text-[var(--color-text)] bg-[rgba(0,0,0,0.30)] rounded p-3 border border-[rgba(255,255,255,0.04)]">
              {overallSnippet}
            </pre>
            {mode === "team" && data.cuts.length > 0 && (
              <div className="text-[11px] text-[var(--color-text-muted)] mt-3">
                Each cut below has its own targeted snippet. Copy the one that matches the angle of the parent tweet.
              </div>
            )}
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

const CUT_SHORT_LABEL: Record<TeamCut, string> = {
  backing: "Backing",
  fading: "Fading",
  totals_over: "Game Over",
  totals_under: "Game Under",
  team_total: "Team total",
  unknown: "Other",
};

const CUT_BLURB: Record<TeamCut, string> = {
  backing: "Capper backed this team (Astros ML, Astros -1.5, ...).",
  fading: "Capper backed the OPPONENT in a game involving this team.",
  totals_over: "Capper picked the Over on a game total involving this team.",
  totals_under: "Capper picked the Under on a game total involving this team.",
  team_total: "Capper picked this team's team total (Over/Under team runs).",
  unknown: "Pick mentioned this team but the side could not be classified. Exotics, weird selection text, or no game context.",
};

function StatBlock({ stat, snippet }: { stat: ResearchStatRow; snippet: string }) {
  const directionsToShow = stat.directions.filter((d) => d.picks > 0);
  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
      <div className="bg-[rgba(255,255,255,0.03)] px-4 py-3 flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex flex-wrap gap-x-6 gap-y-1 items-center">
          <div className="text-[15px] font-extrabold tracking-[-0.01em]">{stat.label}</div>
          <div className="text-[12px] text-[var(--color-text-muted)] tabular-nums">
            {recordStr(stat.wins, stat.losses, stat.pushes)}
            <span className="ml-2">
              {fmtWinRateCell(stat.win_rate, stat.picks - stat.pushes)}
            </span>
            <span className="ml-2">
              {fmtUnitsCell(stat.units, stat.priced_picks)}
            </span>
            <span className="ml-2">{stat.picks} picks</span>
          </div>
        </div>
        <CopySnippetButton text={snippet} />
      </div>
      {directionsToShow.length > 0 && (
        <div className="px-4 py-2">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
              <tr>
                <th className="text-left px-1 py-1 font-bold">Direction</th>
                <th className="text-right px-1 py-1 font-bold">Record</th>
                <th className="text-right px-1 py-1 font-bold">Win rate</th>
                <th className="text-right px-1 py-1 font-bold">Units</th>
                <th className="text-right px-1 py-1 font-bold">ROI</th>
                <th className="text-right px-1 py-1 font-bold">Picks</th>
              </tr>
            </thead>
            <tbody>
              {directionsToShow.map((d) => (
                <tr key={d.direction} className="border-t border-[rgba(255,255,255,0.04)]">
                  <td className="px-1 py-1 font-bold">{d.label}</td>
                  <td className="px-1 py-1 text-right tabular-nums">
                    {recordStr(d.wins, d.losses, d.pushes)}
                  </td>
                  <td className={`px-1 py-1 text-right tabular-nums font-bold ${winRateClass(d.win_rate, d.picks - d.pushes)}`}>
                    {fmtWinRateCell(d.win_rate, d.picks - d.pushes)}
                  </td>
                  <td className={`px-1 py-1 text-right tabular-nums font-bold ${unitsClass(d.priced_picks > 0 ? d.units : 0)}`}>
                    {fmtUnitsCell(d.units, d.priced_picks)}
                  </td>
                  <td className={`px-1 py-1 text-right tabular-nums ${unitsClass(d.priced_picks > 0 ? d.roi_pct : 0)}`}>
                    {fmtRoiCell(d.roi_pct, d.priced_picks)}
                  </td>
                  <td className="px-1 py-1 text-right tabular-nums text-[var(--color-text-muted)]">
                    {d.picks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CutSection({ cut, cutSnippet }: { cut: ResearchCut; cutSnippet: string }) {
  return (
    <section className="rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
      <div className="bg-[rgba(255,255,255,0.03)] px-5 py-4 flex items-start justify-between gap-3 border-b border-[rgba(255,255,255,0.05)]">
        <div>
          <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-bold mb-1">
            Cut
          </div>
          <div className="text-[18px] font-extrabold tracking-[-0.01em]">{cut.label}</div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-1 max-w-md">
            {CUT_BLURB[cut.cut]}
          </div>
        </div>
        <CopySnippetButton text={cutSnippet} />
      </div>

      <div className="px-5 py-4 flex flex-wrap gap-x-8 gap-y-3 border-b border-[rgba(255,255,255,0.05)]">
        <Stat label="Record" value={recordStr(cut.wins, cut.losses, cut.pushes)} />
        <Stat
          label="Win rate"
          value={fmtWinRateCell(cut.win_rate, cut.picks - cut.pushes)}
          accent={cut.picks - cut.pushes >= 3 ? winRateAccent(cut.win_rate) : undefined}
        />
        <Stat
          label="Units"
          value={fmtUnitsCell(cut.units, cut.priced_picks)}
          accent={cut.priced_picks > 0 ? cut.units : undefined}
        />
        <Stat
          label="ROI"
          value={fmtRoiCell(cut.roi_pct, cut.priced_picks)}
          accent={cut.priced_picks > 0 ? cut.roi_pct : undefined}
        />
        <Stat label="Picks" value={String(cut.picks)} />
      </div>

      <div className="px-5 py-4">
        <div className="text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] font-extrabold mb-2">
          Per capper in this cut
        </div>
        <div className="rounded-md border border-[rgba(255,255,255,0.05)] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-[rgba(255,255,255,0.02)] text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
              <tr>
                <th className="text-left px-3 py-1.5 font-bold">Handle</th>
                <th className="text-right px-3 py-1.5 font-bold">Record</th>
                <th className="text-right px-3 py-1.5 font-bold">Win rate</th>
                <th className="text-right px-3 py-1.5 font-bold">Units</th>
                <th className="text-right px-3 py-1.5 font-bold">ROI</th>
                <th className="text-right px-3 py-1.5 font-bold">Picks</th>
              </tr>
            </thead>
            <tbody>
              {cut.by_capper.map((c) => (
                <tr key={c.capper_id} className="border-t border-[rgba(255,255,255,0.04)]">
                  <td className="px-3 py-1.5 font-bold">
                    {c.handle ? formatHandle(c.handle) : `capper#${c.capper_id}`}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {recordStr(c.wins, c.losses, c.pushes)}
                  </td>
                  <td className={`px-3 py-1.5 text-right tabular-nums font-bold ${winRateClass(c.win_rate, c.picks - c.pushes)}`}>
                    {fmtWinRateCell(c.win_rate, c.picks - c.pushes)}
                  </td>
                  <td className={`px-3 py-1.5 text-right tabular-nums font-bold ${unitsClass(c.priced_picks > 0 ? c.units : 0)}`}>
                    {fmtUnitsCell(c.units, c.priced_picks)}
                  </td>
                  <td className={`px-3 py-1.5 text-right tabular-nums ${unitsClass(c.priced_picks > 0 ? c.roi_pct : 0)}`}>
                    {fmtRoiCell(c.roi_pct, c.priced_picks)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-[var(--color-text-muted)]">
                    {c.picks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function winRateClass(rate: number, decided: number): string {
  if (decided < 3) return "text-[var(--color-text-muted)]";
  // 5pp band around 50% reads as neutral so a 9-9 record doesn't get a
  // false-green tint at 50%.
  if (rate > 0.55) return "text-[#4ade80]";
  if (rate < 0.45) return "text-[#f87171]";
  return "text-[var(--color-text)]";
}
