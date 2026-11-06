/**
 * NCAAB slate OG card: the size of the night instead of one featured game.
 * Left: bets / cappers / games with action and the market mix. Right: the
 * games drawing the most cappers. Everything that matters sits in the top
 * ~470px; X lays its caption scrim over the bottom ~120px in-feed.
 */
import type { NcaabVolume, VolumeGame } from "@/lib/ncaab-og-volume";

const BG = "#0a0a0c";
const OFF = "#f7f3e9";
const OFF_DIM = "rgba(247, 243, 233, 0.62)";
const OFF_FAINT = "rgba(247, 243, 233, 0.40)";
const HAIR = "rgba(247, 243, 233, 0.12)";
const BURGUNDY = "#962048";
const MONO = "JetBrains Mono";

/** Off-white at falling strength: the mix bar stays inside the off-white-only rule. */
const MIX_FILL: Record<string, string> = {
  SPREAD: "rgba(247, 243, 233, 0.92)",
  TOTAL: "rgba(247, 243, 233, 0.58)",
  ML: "rgba(247, 243, 233, 0.32)",
  OTHER: "rgba(247, 243, 233, 0.16)",
};

export interface NcaabCardInputs {
  wordmark: string | null;
  leagueLogo: string | null;
  dateLabel: string;
  volume: NcaabVolume;
  /** Data URIs by game id. */
  logos: Map<number, { away: string | null; home: string | null }>;
}

function Img({ src, size }: { src: string | null; size: number }) {
  if (!src) {
    return (
      <div style={{ width: size, height: size, borderRadius: size / 2, background: "rgba(255,255,255,0.08)", display: "flex" }} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: "contain" }} />
  );
}

function Label({ children, color = OFF_DIM }: { children: string; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: 2.6,
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </div>
  );
}

function Stat({ value, label, size }: { value: string; label: string; size: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", fontSize: size, fontWeight: 800, lineHeight: 1, letterSpacing: -size * 0.03, color: OFF }}>
        {value}
      </div>
      <div style={{ display: "flex", marginTop: 8 }}>
        <Label>{label}</Label>
      </div>
    </div>
  );
}

function MixBar({ volume }: { volume: NcaabVolume }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
      <Label>Market mix</Label>
      <div style={{ display: "flex", height: 16, marginTop: 12, borderRadius: 4, overflow: "hidden", background: "#222" }}>
        {volume.mix.map((s) => (
          <div key={s.key} style={{ display: "flex", width: `${s.pct}%`, background: MIX_FILL[s.key] }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", columnGap: 20, rowGap: 8, marginTop: 12 }}>
        {volume.mix.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: 2, background: MIX_FILL[s.key] }} />
            <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 15, color: OFF_DIM }}>
              {`${s.key} ${s.pct}%`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GameRow({
  game,
  rank,
  maxCappers,
  logos,
}: {
  game: VolumeGame;
  rank: number;
  maxCappers: number;
  logos: { away: string | null; home: string | null } | undefined;
}) {
  const widthPct = maxCappers > 0 ? Math.max(6, Math.round((game.cappers / maxCappers) * 100)) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", paddingTop: 11, paddingBottom: 9, borderBottom: `1px solid ${HAIR}` }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", width: 30, fontFamily: MONO, fontWeight: 700, fontSize: 16, color: OFF_FAINT }}>{rank}</div>
        <Img src={logos?.away ?? null} size={34} />
        <div style={{ display: "flex", marginLeft: 10, fontSize: 25, fontWeight: 800, color: OFF, letterSpacing: -0.3 }}>{game.away}</div>
        <div style={{ display: "flex", margin: "0 12px", fontSize: 18, fontWeight: 700, color: OFF_FAINT }}>@</div>
        <Img src={logos?.home ?? null} size={34} />
        <div style={{ display: "flex", marginLeft: 10, fontSize: 25, fontWeight: 800, color: OFF, letterSpacing: -0.3 }}>{game.home}</div>
        <div style={{ display: "flex", flex: 1 }} />
        {game.lean ? (
          <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 17, color: OFF_DIM, marginRight: 22 }}>
            {`${game.leanCount} on ${game.lean}`}
          </div>
        ) : null}
        <div style={{ display: "flex", width: 44, justifyContent: "flex-end", fontSize: 30, fontWeight: 800, color: OFF }}>
          {String(game.cappers)}
        </div>
      </div>
      <div style={{ display: "flex", marginTop: 8, marginLeft: 30, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)" }}>
        <div
          style={{
            display: "flex",
            width: `${widthPct}%`,
            borderRadius: 2,
            backgroundImage: `linear-gradient(90deg, ${game.awayColor} 0%, ${game.homeColor} 100%)`,
          }}
        />
      </div>
    </div>
  );
}

export function buildNcaabJsx({ wordmark, leagueLogo, dateLabel, volume, logos }: NcaabCardInputs) {
  const maxCappers = volume.top.reduce((m, g) => Math.max(m, g.cappers), 0);
  const empty = volume.bets === 0;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: BG,
        color: OFF,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Manrope, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Burgundy league wash from the top left, matching the site's NCAAB tint. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          backgroundImage:
            "linear-gradient(150deg, rgba(150, 32, 72, 0.46) 0%, rgba(122, 31, 61, 0.14) 38%, rgba(10, 10, 12, 0) 62%)",
        }}
      />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, display: "flex", background: BURGUNDY }} />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "22px 52px 24px", position: "relative" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Wordmark and the league mark side by side: the NCAAB logo is the focal brand. */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {wordmark ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={wordmark} alt="TailSlips" height={34} style={{ height: 34 }} />
            ) : (
              <div style={{ display: "flex", fontSize: 32, fontWeight: 800 }}>TAILSLIPS</div>
            )}
            {leagueLogo ? (
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", width: 1, height: 52, margin: "0 24px", background: "rgba(247, 243, 233, 0.22)" }} />
                <Img src={leagueLogo} size={76} />
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: 999,
              border: "1px solid rgba(247, 243, 233, 0.16)",
              background: "rgba(255, 255, 255, 0.05)",
            }}
          >
            <Label color={OFF}>{`College hoops · ${dateLabel}`}</Label>
          </div>
        </div>

        {empty ? (
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800 }}>
            Sharps haven&apos;t posted yet.
          </div>
        ) : (
          <div style={{ display: "flex", marginTop: 18 }}>
            {/* Left: the size of the night. */}
            <div style={{ display: "flex", flexDirection: "column", width: 420, paddingRight: 40 }}>
              <Stat value={String(volume.bets)} label={volume.bets === 1 ? "Bet tracked" : "Bets tracked"} size={124} />
              <div style={{ display: "flex", gap: 44, marginTop: 28 }}>
                <Stat value={String(volume.cappers)} label={volume.cappers === 1 ? "Capper" : "Cappers"} size={58} />
                <Stat value={`${volume.gamesWithAction}/${volume.totalGames}`} label="Games bet" size={58} />
              </div>
              <MixBar volume={volume} />
            </div>

            {/* Right: where the cappers are. */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingLeft: 36, borderLeft: `1px solid ${HAIR}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 4 }}>
                <Label>Most action</Label>
                <Label color={OFF_FAINT}>Cappers</Label>
              </div>
              {volume.top.map((g, i) => (
                <GameRow key={g.id} game={g} rank={i + 1} maxCappers={maxCappers} logos={logos.get(g.id)} />
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flex: 1 }} />
        {/* Sacrificial ticker: X's caption scrim covers this band in-feed. */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: MONO,
            fontWeight: 500,
            fontSize: 12,
            letterSpacing: 2.4,
            textTransform: "uppercase",
            color: "rgba(247, 243, 233, 0.45)",
          }}
        >
          <div style={{ display: "flex" }}>{`${volume.totalGames} games ${dateLabel.toLowerCase()} · NCAAB`}</div>
          <div style={{ display: "flex", color: "rgba(247, 243, 233, 0.70)", fontWeight: 700 }}>tailslips.com</div>
        </div>
      </div>
    </div>
  );
}
