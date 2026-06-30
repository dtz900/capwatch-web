import type { PalaceLeg } from "@/lib/types";

// Right-edge "did the bet hit" badge. For player props (Ks, HRs, hits,
// RBIs) the player's number is what settles the leg, not the game score,
// so prefer result_text on those. Team / total legs keep falling back to
// score_text.
function ResultBadge({ leg, odds }: { leg: PalaceLeg; odds: string | null }) {
  const outcome = (leg.outcome ?? "").toLowerCase();
  const voided = outcome === "void";
  const pushed = outcome === "push";

  // A voided / pushed leg dropped out of the parlay. Show that explicitly
  // instead of the box-score result (which is meaningless for a player who
  // never played) and instead of a green check. The leg's odds are struck
  // through because they did not count toward the payout.
  if (voided || pushed) {
    return (
      <div className="text-right shrink-0">
        <div className="inline-flex items-center gap-1.5 rounded-md bg-[rgba(255,255,255,0.04)] ring-1 ring-[rgba(255,255,255,0.1)] px-2 py-1">
          {voided && (
            <span className="text-[rgba(255,255,255,0.5)] text-[12px] font-bold" aria-hidden="true">
              ✕
            </span>
          )}
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[rgba(255,255,255,0.55)]">
            {voided ? "Void" : "Push"}
          </span>
        </div>
        {odds && (
          <div className="mt-1 text-[10px] font-bold tracking-wide text-[rgba(255,255,255,0.26)] tabular-nums line-through">
            {odds}
          </div>
        )}
      </div>
    );
  }

  const display = leg.player_id != null
    ? (leg.result_text ?? leg.score_text)
    : (leg.score_text ?? leg.result_text);
  return (
    <div className="text-right shrink-0">
      {display ? (
        <div className="inline-flex items-center gap-1.5 rounded-md bg-[rgba(255,255,255,0.045)] ring-1 ring-[rgba(255,255,255,0.07)] px-2 py-1">
          <span className="text-[12px] font-bold text-[rgba(255,255,255,0.86)] tabular-nums">
            {display}
          </span>
          {(leg.won || (display === leg.result_text)) && (
            <span className="text-[#5fd39b]" aria-hidden="true">✓</span>
          )}
        </div>
      ) : null}
      {odds && (
        <div className="mt-1 text-[10px] font-bold tracking-wide text-[rgba(255,255,255,0.34)] tabular-nums">
          {odds}
        </div>
      )}
    </div>
  );
}

// Clean light logo tile so the real full-color MLB marks stay crisp (no
// silhouette/wash). Total legs show both teams in the matchup.
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center overflow-hidden bg-[#f3f4f6] ring-1 ring-[rgba(0,0,0,0.08)] shadow-[inset_0_-1px_2px_rgba(0,0,0,0.06)]">
      {children}
    </div>
  );
}

function sentenceCase(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

// Selection strings come in two flavors: full-sentence ("Freddie Freeman To
// Hit A Home Run", capper-typed) and short-token ("OVER"/"UNDER", parsed).
// We render the player_name as the title line, so the action subtitle should
// never repeat that name. Strip the prefix if present and sentence-case the
// rest; for OVER/UNDER tokens, attach the line.
function actionText(leg: PalaceLeg): string | null {
  const sel = (leg.selection ?? "").trim();
  if (!sel) return leg.line != null ? `Line ${leg.line}` : null;
  const name = (leg.player_name ?? "").trim();
  let rest = sel;
  if (name && rest.toLowerCase().startsWith(name.toLowerCase())) {
    rest = rest.slice(name.length).trim();
  }
  const lower = rest.toLowerCase();
  if (lower === "over" && leg.line != null) return `Over ${leg.line}`;
  if (lower === "under" && leg.line != null) return `Under ${leg.line}`;
  if (!rest) return null;
  return sentenceCase(rest);
}

function titleLines(leg: PalaceLeg, market: string): {
  title: string; subtitle: string | null
} {
  if (leg.player_name) {
    return { title: leg.player_name, subtitle: actionText(leg) };
  }
  if (market === "total" && leg.line != null) {
    const sel = (leg.selection ?? "").trim().toLowerCase();
    const dir = sel === "over" ? "Over" : sel === "under" ? "Under" : sel;
    return { title: `${dir} ${leg.line}`, subtitle: null };
  }
  return { title: leg.selection ?? "Leg", subtitle: null };
}

export function LegRow({ leg, position }: { leg: PalaceLeg; position: number }) {
  const odds =
    leg.odds_taken == null
      ? null
      : `${leg.odds_taken > 0 ? "+" : ""}${leg.odds_taken}`;
  const market = (leg.market ?? "").toLowerCase();
  const { title, subtitle } = titleLines(leg, market);

  const outcome = (leg.outcome ?? "").toLowerCase();
  const voided = outcome === "void";
  const pushed = outcome === "push";
  const dropped = voided || pushed; // leg fell out of the parlay

  const single = leg.team_logo_url ?? leg.headshot_url;
  const isHeadshot = !leg.team_logo_url && !!leg.headshot_url;
  const pair =
    !leg.team_logo_url && leg.away_logo_url && leg.home_logo_url
      ? [
          { src: leg.away_logo_url, a: leg.away_abbr ?? "away" },
          { src: leg.home_logo_url, a: leg.home_abbr ?? "home" },
        ]
      : null;

  const logoNode = pair ? (
    <div className="shrink-0 flex items-center gap-1">
      <span className="w-9 h-9 rounded-lg bg-[#f3f4f6] ring-1 ring-[rgba(0,0,0,0.08)] flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pair[0].src}
          alt={pair[0].a}
          width={36}
          height={36}
          className="w-6 h-6 object-contain"
        />
      </span>
      <span className="text-[rgba(255,255,255,0.32)] text-[13px] font-bold leading-none">
        /
      </span>
      <span className="w-9 h-9 rounded-lg bg-[#f3f4f6] ring-1 ring-[rgba(0,0,0,0.08)] flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pair[1].src}
          alt={pair[1].a}
          width={36}
          height={36}
          className="w-6 h-6 object-contain"
        />
      </span>
    </div>
  ) : single ? (
    <Chip>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={single}
        alt={leg.team_abbr ?? leg.player_name ?? leg.selection ?? "leg"}
        width={44}
        height={44}
        className={
          isHeadshot
            ? "w-11 h-11 object-cover"
            : "w-[30px] h-[30px] object-contain"
        }
      />
    </Chip>
  ) : (
    <Chip>
      <span className="text-[11px] font-black text-[#5b606b]">
        {leg.team_abbr ?? "TOT"}
      </span>
    </Chip>
  );

  return (
    <div className="flex items-center gap-3.5 py-3.5 border-b border-[rgba(255,255,255,0.055)] last:border-b-0">
      {dropped ? (
        <div className="opacity-40 grayscale">{logoNode}</div>
      ) : (
        logoNode
      )}

      <div className="flex-1 min-w-0">
        <div
          className={`text-[14px] font-bold truncate leading-tight ${
            dropped
              ? "line-through text-[rgba(255,255,255,0.45)]"
              : "text-white"
          }`}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className={`text-[11.5px] font-medium truncate leading-tight mt-0.5 ${
              dropped
                ? "text-[rgba(255,255,255,0.3)]"
                : "text-[rgba(255,255,255,0.55)]"
            }`}
          >
            {subtitle}
          </div>
        )}
        <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] font-bold">
          <span className="text-[rgba(255,255,255,0.38)]">Leg {position}</span>
          {dropped && (
            <span className="text-[rgba(255,255,255,0.5)]">
              · {voided ? "Voided" : "Push"}
            </span>
          )}
          {!dropped && leg.is_clincher && (
            <span className="text-[#e3c787]">· Clincher</span>
          )}
        </div>
      </div>

      <ResultBadge leg={leg} odds={odds} />
    </div>
  );
}
