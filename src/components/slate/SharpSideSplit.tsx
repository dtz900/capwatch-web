import { normalizeMarket } from "@/lib/markets";
import { teamColor } from "@/lib/mlb-teams";
import type { SlatePick } from "@/lib/types";

interface Props {
  picks: SlatePick[];
  awayTeam: string | null;
  homeTeam: string | null;
}

interface Split {
  label: string;
  awayCount: number;
  homeCount: number;
  awayLabel: string;
  homeLabel: string;
  awayColor: string;
  homeColor: string;
}

function classifyMlSide(selection: string | null, away: string | null, home: string | null): "away" | "home" | null {
  if (!selection) return null;
  const s = selection.toLowerCase();
  if (away && s.includes(away.toLowerCase())) return "away";
  if (home && s.includes(home.toLowerCase())) return "home";
  return null;
}

function classifyTotalSide(selection: string | null): "over" | "under" | null {
  if (!selection) return null;
  const s = selection.trim().toLowerCase();
  if (s.startsWith("over") || s.startsWith("o ") || s === "o") return "over";
  if (s.startsWith("under") || s.startsWith("u ") || s === "u") return "under";
  return null;
}

function buildSplit(picks: SlatePick[], away: string | null, home: string | null): Split | null {
  // Bucket by normalized market.
  const ml: SlatePick[] = [];
  const total: SlatePick[] = [];
  for (const p of picks) {
    if (!p.market) continue;
    const bucket = normalizeMarket(p.market);
    if (bucket === "Moneyline") ml.push(p);
    else if (bucket === "Total") total.push(p);
  }

  if (ml.length >= 3) {
    let a = 0;
    let h = 0;
    for (const p of ml) {
      const side = classifyMlSide(p.selection, away, home);
      if (side === "away") a++;
      else if (side === "home") h++;
    }
    if (a + h < 3) return null;
    return {
      label: "ML",
      awayCount: a,
      homeCount: h,
      awayLabel: away ?? "Away",
      homeLabel: home ?? "Home",
      awayColor: teamColor(away),
      homeColor: teamColor(home),
    };
  }

  if (total.length >= 3) {
    let o = 0;
    let u = 0;
    for (const p of total) {
      const side = classifyTotalSide(p.selection);
      if (side === "over") o++;
      else if (side === "under") u++;
    }
    if (o + u < 3) return null;
    return {
      label: "TOTAL",
      awayCount: o,
      homeCount: u,
      awayLabel: "Over",
      homeLabel: "Under",
      awayColor: "#86efac",
      homeColor: "#c4b5fd",
    };
  }

  return null;
}

export function SharpSideSplit({ picks, awayTeam, homeTeam }: Props) {
  const split = buildSplit(picks, awayTeam, homeTeam);
  if (!split) return null;
  const total = split.awayCount + split.homeCount;
  const awayPct = Math.round((split.awayCount / total) * 100);
  const homePct = 100 - awayPct;

  return (
    <div className="px-1 mt-3 mb-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.10em] font-bold mb-1.5">
        <span style={{ color: split.awayColor === "#3b3b3b" ? "var(--color-text-soft)" : split.awayColor }}>
          {split.awayLabel} {split.awayCount}
        </span>
        <span className="text-[var(--color-text-muted)] tracking-[0.14em] opacity-70">{split.label} split</span>
        <span style={{ color: split.homeColor === "#3b3b3b" ? "var(--color-text-soft)" : split.homeColor }}>
          {split.homeCount} {split.homeLabel}
        </span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-[rgba(255,255,255,0.04)]">
        {split.awayCount > 0 && (
          <div
            className="h-full transition-[width] duration-500"
            style={{ width: `${awayPct}%`, backgroundColor: split.awayColor }}
            aria-label={`${split.awayLabel} ${awayPct}%`}
          />
        )}
        {split.homeCount > 0 && (
          <div
            className="h-full transition-[width] duration-500"
            style={{ width: `${homePct}%`, backgroundColor: split.homeColor }}
            aria-label={`${split.homeLabel} ${homePct}%`}
          />
        )}
      </div>
    </div>
  );
}
