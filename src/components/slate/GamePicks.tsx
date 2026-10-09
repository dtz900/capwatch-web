import Link from "next/link";
import type { ReactNode } from "react";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { XIcon } from "@/components/icons/XIcon";
import { SlatePickRow } from "./SlatePickRow";
import { VersusPickRow } from "./VersusPickRow";
import { OutcomeBadge } from "./OutcomeBadge";
import { PicksViewToggle } from "./PicksViewToggle";
import { formatPickText } from "@/lib/bet-format";
import { trimUnits } from "@/lib/formatters";
import { sharpTier, ELITE_RING_SHADOW } from "@/lib/sharp-tier";
import { teamColor } from "@/lib/teams";
import { groupByCapper, groupByMarket, propStat, propStatSummary, type PlayerGroup } from "@/lib/slate-groups";
import type { SlatePick, Sport } from "@/lib/types";

// Rows shown before a section folds the rest behind "N more".
const SIDE_CAP = 4;
const PLAYER_CAP = 6;
const OTHER_CAP = 5;
const CAPPER_CAP = 8;
const EXPANDED_CAP = 8;
// Below this a card is short enough that the capper view adds nothing.
const TOGGLE_MIN_PICKS = 4;

const TOTAL_COLOR = "#cbd5e1";

interface Ctx {
  awayTeam: string | null;
  homeTeam: string | null;
  showPnl: boolean;
}

function sumRisked(picks: SlatePick[]): number {
  // Voided picks drop out; pushes and pending picks keep their stake.
  return picks.filter((p) => p.outcome !== "V").reduce((acc, p) => acc + (p.stake_units ?? 0), 0);
}

function sumProfit(picks: SlatePick[]): number {
  return picks.reduce((acc, p) => acc + (p.profit_units ?? 0), 0);
}

function signedUnits(u: number): string {
  const sign = u > 0 ? "+" : u < 0 ? "−" : "±";
  return `${sign}${Math.abs(u).toFixed(2)}u`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function distinctCappers(picks: SlatePick[]): number {
  return new Set(picks.map((p) => p.capper_id)).size;
}

/** "3-1 · +2.10u" once anything is graded, else the stake on the line. */
function tally(picks: SlatePick[]): string {
  const graded = picks.filter((p) => p.outcome && p.outcome !== "V");
  if (graded.length === 0) return `${trimUnits(sumRisked(picks))}u`;
  const w = graded.filter((p) => p.outcome === "W").length;
  const l = graded.filter((p) => p.outcome === "L").length;
  const push = graded.filter((p) => p.outcome === "P").length;
  const record = push ? `${w}-${l}-${push}` : `${w}-${l}`;
  return `${record} · ${signedUnits(sumProfit(picks))}`;
}

function SectionHeader({ title, right }: { title: string; right?: string }) {
  return (
    <div className="flex items-baseline justify-between pb-2 mb-1 border-b border-[rgba(255,255,255,0.10)]">
      <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--color-text-muted)]">
        {title}
      </span>
      {right && (
        <span className="text-[11px] tabular-nums font-bold text-[var(--color-text-muted)]">{right}</span>
      )}
    </div>
  );
}

/** First `cap` rows inline, the rest behind a native disclosure. */
function Capped({ rows, cap, noun }: { rows: ReactNode[]; cap: number; noun: string }) {
  if (rows.length <= cap) return <>{rows}</>;
  const rest = rows.length - cap;
  return (
    <>
      {rows.slice(0, cap)}
      <details className="group">
        <summary className="list-none cursor-pointer select-none py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)] hover:text-[var(--color-text-soft)] [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">+ {plural(rest, `more ${noun}`, `more ${noun}s`)}</span>
          <span className="hidden group-open:inline">Show fewer</span>
        </summary>
        {rows.slice(cap)}
      </details>
    </>
  );
}

function AvatarStack({ picks, max = 4 }: { picks: SlatePick[]; max?: number }) {
  const seen = new Set<number>();
  const unique = picks.filter((p) => (seen.has(p.capper_id) ? false : (seen.add(p.capper_id), true)));
  const shown = unique.slice(0, max);
  return (
    <span className="flex items-center shrink-0">
      {shown.map((p, i) => (
        <span
          key={p.capper_id}
          className={`rounded-full ring-2 ring-[#101015] ${i > 0 ? "-ml-2" : ""}`}
          style={sharpTier(p.capper_rank) ? { boxShadow: ELITE_RING_SHADOW } : undefined}
          title={p.handle ? `@${p.handle}` : undefined}
        >
          <CapperAvatar
            url={p.profile_image_url}
            handle={p.handle}
            size={22}
            apiIntegrated={p.handle === "fadeai_"}
          />
        </span>
      ))}
      {unique.length > max && (
        <span className="ml-1 text-[10px] font-bold tabular-nums text-[var(--color-text-muted)]">
          +{unique.length - max}
        </span>
      )}
    </span>
  );
}

function VersusSide({
  label,
  market,
  color,
  picks,
  ctx,
  emptyText,
}: {
  label: string;
  market: string;
  color: string;
  picks: SlatePick[];
  ctx: Ctx;
  emptyText: string;
}) {
  const head =
    picks.length === 0
      ? "0 sharps"
      : `${plural(picks.length, "sharp", "sharps")} · ${sumRisked(picks).toFixed(2)}u risked${
          ctx.showPnl ? ` · ${signedUnits(sumProfit(picks))}` : ""
        }`;
  return (
    <div className="min-w-0">
      <div
        className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-y-0.5 pb-2 mb-1 border-b-2"
        style={{ borderColor: color }}
      >
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--color-text-muted)]">
            Backing
          </span>
          <span className="text-[15px] font-extrabold tracking-tight" style={{ color }}>
            {label}
          </span>
          <span className="text-[10px] uppercase tracking-[0.10em] font-semibold text-[var(--color-text-muted)] truncate">
            {market}
          </span>
        </div>
        <span className="text-[10.5px] tabular-nums font-bold text-[var(--color-text-muted)] whitespace-normal sm:whitespace-nowrap">
          {head}
        </span>
      </div>
      {picks.length === 0 ? (
        <div className="text-[11px] italic text-[var(--color-text-muted)] py-2">{emptyText}</div>
      ) : (
        <div className="flex flex-col">
          <Capped
            cap={SIDE_CAP}
            noun="pick"
            rows={picks.map((pick, i) => (
              <VersusPickRow
                key={`${pick.capper_id}-${i}`}
                pick={pick}
                awayTeam={ctx.awayTeam}
                homeTeam={ctx.homeTeam}
              />
            ))}
          />
        </div>
      )}
    </div>
  );
}

function Versus({
  market,
  left,
  right,
  ctx,
}: {
  market: string;
  left: { label: string; color: string; picks: SlatePick[] };
  right: { label: string; color: string; picks: SlatePick[] };
  ctx: Ctx;
}) {
  if (left.picks.length + right.picks.length === 0) return null;
  return (
    <div className="grid [grid-template-columns:minmax(0,1fr)_minmax(0,1fr)] gap-x-3 sm:gap-x-10 mt-8 max-w-[680px] mx-auto">
      {[left, right].map((s) => (
        <VersusSide
          key={s.label}
          label={s.label}
          market={market}
          color={s.color}
          picks={s.picks}
          ctx={ctx}
          emptyText={`No sharps on ${s.label} ${market}.`}
        />
      ))}
    </div>
  );
}

/** Expanded player rows follow the summary order: busiest stat first. */
function sortByStat(picks: SlatePick[], summary: { stat: string }[]): SlatePick[] {
  const order = new Map(summary.map((x, i) => [x.stat, i]));
  return [...picks].sort(
    (a, b) => (order.get(propStat(a.selection)) ?? 0) - (order.get(propStat(b.selection)) ?? 0),
  );
}

function PlayerRow({ group, ctx }: { group: PlayerGroup; ctx: Ctx }) {
  const summary = propStatSummary(group.picks);
  const stats = (
    <>
      {summary.map((x, i) => (
        <span key={x.stat}>
          {i > 0 && <span className="text-[var(--color-text-muted)]"> · </span>}
          {x.stat}
          {x.count > 1 && <span className="ml-1 text-[var(--color-text-muted)] tabular-nums">{x.count}</span>}
        </span>
      ))}
    </>
  );
  const cappers = distinctCappers(group.picks);
  return (
    <details className="group border-b border-[rgba(255,255,255,0.05)] last:border-b-0">
      <summary className="list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,11rem)_auto_minmax(0,1fr)_auto] items-center gap-x-3 py-2 text-[13px] hover:bg-[rgba(255,255,255,0.02)]">
        <span
          aria-hidden
          className="text-[10px] text-[var(--color-text-muted)] transition-transform group-open:rotate-90"
        >
          ▶
        </span>
        <span className="font-bold text-[var(--color-text)] truncate">{group.name}</span>
        <span className="hidden sm:flex">
          <AvatarStack picks={group.picks} />
        </span>
        <span className="hidden sm:block truncate text-[12px] text-[var(--color-text-soft)]">
          {stats}
        </span>
        <span className="text-right text-[11px] tabular-nums font-bold text-[var(--color-text-muted)] whitespace-nowrap">
          {plural(cappers, "capper", "cappers")} · {tally(group.picks)}
        </span>
        <span className="col-start-2 col-span-2 sm:hidden truncate text-[11px] text-[var(--color-text-soft)]">
          {stats}
        </span>
      </summary>
      <div className="pl-5 pb-2">
        <Capped
          cap={EXPANDED_CAP}
          noun="pick"
          rows={sortByStat(group.picks, summary).map((pick, i) => (
            <SlatePickRow
              key={`${pick.capper_id}-${i}`}
              pick={pick}
              awayTeam={ctx.awayTeam}
              homeTeam={ctx.homeTeam}
            />
          ))}
        />
      </div>
    </details>
  );
}

function MarketView({ picks, sport, ctx }: { picks: SlatePick[]; sport: Sport; ctx: Ctx }) {
  const g = groupByMarket(picks, ctx.awayTeam, ctx.homeTeam, sport);
  const away = { label: ctx.awayTeam ?? "Away", color: teamColor(ctx.awayTeam, sport) };
  const home = { label: ctx.homeTeam ?? "Home", color: teamColor(ctx.homeTeam, sport) };
  const propCount = g.players.reduce((acc, p) => acc + p.picks.length, 0);
  return (
    <>
      <Versus market="moneyline" left={{ ...away, picks: g.ml.away }} right={{ ...home, picks: g.ml.home }} ctx={ctx} />
      <Versus
        market={sport === "MLB" ? "run line" : "spread"}
        left={{ ...away, picks: g.spread.away }}
        right={{ ...home, picks: g.spread.home }}
        ctx={ctx}
      />
      <Versus
        market="total"
        left={{ label: "Over", color: TOTAL_COLOR, picks: g.total.over }}
        right={{ label: "Under", color: TOTAL_COLOR, picks: g.total.under }}
        ctx={ctx}
      />

      {g.players.length > 0 && (
        <div className="mt-8 max-w-[680px] mx-auto">
          <SectionHeader
            title="Player props"
            right={`${plural(g.players.length, "player", "players")} · ${plural(propCount, "pick", "picks")}`}
          />
          <Capped
            cap={PLAYER_CAP}
            noun="player"
            rows={g.players.map((group) => <PlayerRow key={group.key} group={group} ctx={ctx} />)}
          />
        </div>
      )}

      {g.other.length > 0 && (
        <div className="mt-8 max-w-[680px] mx-auto">
          <SectionHeader title="Game props & more" right={plural(g.other.length, "pick", "picks")} />
          <Capped
            cap={OTHER_CAP}
            noun="pick"
            rows={g.other.map((pick, i) => (
              <SlatePickRow
                key={`${pick.capper_id}-${i}`}
                pick={pick}
                awayTeam={ctx.awayTeam}
                homeTeam={ctx.homeTeam}
              />
            ))}
          />
        </div>
      )}
    </>
  );
}

function CompactPickLine({ pick, ctx }: { pick: SlatePick; ctx: Ctx }) {
  const isParlayLeg = pick.kind === "parlay_leg" && (pick.leg_count ?? 0) > 1;
  const isHeavy = pick.stake_units >= 2;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_1.25rem] items-center gap-x-3 py-1 text-[12.5px]">
      <span className={`truncate tabular-nums text-[var(--color-text)] ${isHeavy ? "font-extrabold" : "font-semibold"}`}>
        {formatPickText({ pick, awayTeam: ctx.awayTeam, homeTeam: ctx.homeTeam })}
      </span>
      <span className="flex items-center justify-end gap-1.5 text-[11px] tabular-nums">
        {pick.outcome ? (
          <OutcomeBadge outcome={pick.outcome} profitUnits={pick.profit_units} />
        ) : (
          <span className={isHeavy ? "text-[var(--color-gold)] font-extrabold" : "text-[var(--color-text-muted)] font-medium"}>
            {trimUnits(pick.stake_units)}u
          </span>
        )}
        {isParlayLeg && (
          <span className="text-[10px] text-[var(--color-text-muted)] opacity-80">in {pick.leg_count}-leg</span>
        )}
      </span>
      <span className="flex justify-end">
        {pick.tweet_url && (
          <a
            href={pick.tweet_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View original tweet"
            className="text-[var(--color-text-muted)] opacity-50 hover:opacity-100 hover:text-white transition-opacity"
          >
            <XIcon size={10} />
          </a>
        )}
      </span>
    </div>
  );
}

function CapperRow({ picks, ctx }: { picks: SlatePick[]; ctx: Ctx }) {
  const first = picks[0];
  const tier = sharpTier(first.capper_rank);
  const rankStr = first.capper_rank != null && first.capper_rank <= 99 ? `#${first.capper_rank}` : null;
  const preview = picks
    .map((p) => formatPickText({ pick: p, awayTeam: ctx.awayTeam, homeTeam: ctx.homeTeam }))
    .join(" · ");
  return (
    <details className="group border-b border-[rgba(255,255,255,0.05)] last:border-b-0">
      <summary className="list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 py-2 text-[13px] hover:bg-[rgba(255,255,255,0.02)]">
        <span
          aria-hidden
          className="text-[10px] text-[var(--color-text-muted)] transition-transform group-open:rotate-90"
        >
          ▶
        </span>
        <span className="rounded-full" style={tier ? { boxShadow: ELITE_RING_SHADOW } : undefined}>
          <CapperAvatar
            url={first.profile_image_url}
            handle={first.handle}
            size={24}
            apiIntegrated={first.handle === "fadeai_"}
          />
        </span>
        <span className="min-w-0 flex flex-col leading-tight">
          <span className="truncate">
            {rankStr && (
              <span
                className="text-[11px] font-extrabold tabular-nums mr-1.5"
                style={{ color: tier?.color ?? "var(--color-text-muted)" }}
              >
                {rankStr}
              </span>
            )}
            <span
              className={`font-semibold ${tier ? "" : "text-[var(--color-text-soft)]"}`}
              style={tier ? { color: tier.color } : undefined}
            >
              {first.handle ? `@${first.handle}` : "capper"}
            </span>
          </span>
          <span className="truncate text-[11px] text-[var(--color-text-muted)] group-open:hidden">{preview}</span>
        </span>
        <span className="text-right text-[11px] tabular-nums font-bold text-[var(--color-text-muted)] whitespace-nowrap">
          {plural(picks.length, "pick", "picks")} · {tally(picks)}
        </span>
      </summary>
      <div className="pl-[3.25rem] pb-2">
        {first.handle && (
          <Link
            href={`/cappers/${first.handle}`}
            className="inline-block mb-1 text-[10.5px] uppercase tracking-[0.12em] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-soft)]"
          >
            View profile
          </Link>
        )}
        {picks.map((pick, i) => (
          <CompactPickLine key={`${pick.capper_id}-${i}`} pick={pick} ctx={ctx} />
        ))}
      </div>
    </details>
  );
}

function CapperView({ picks, ctx }: { picks: SlatePick[]; ctx: Ctx }) {
  const groups = groupByCapper(picks);
  return (
    <div className="mt-6 max-w-[680px] mx-auto">
      <SectionHeader
        title="Cappers on this game"
        right={`${plural(groups.length, "capper", "cappers")} · ${plural(picks.length, "pick", "picks")}`}
      />
      <Capped
        cap={CAPPER_CAP}
        noun="capper"
        rows={groups.map((g) => <CapperRow key={g.capperId} picks={g.picks} ctx={ctx} />)}
      />
    </div>
  );
}

export function GamePicks({
  picks,
  sport,
  awayTeam,
  homeTeam,
  showPnl,
}: {
  picks: SlatePick[];
  sport: Sport;
  awayTeam: string | null;
  homeTeam: string | null;
  showPnl: boolean;
}) {
  if (picks.length === 0) return null;
  const ctx: Ctx = { awayTeam, homeTeam, showPnl };
  const market = <MarketView picks={picks} sport={sport} ctx={ctx} />;
  if (picks.length < TOGGLE_MIN_PICKS || distinctCappers(picks) < 2) return market;
  return <PicksViewToggle market={market} capper={<CapperView picks={picks} ctx={ctx} />} />;
}
