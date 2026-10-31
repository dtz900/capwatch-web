import { ImageResponse } from "next/og";
import { avatarDataUri, bigAvatarUrl, fileDataUri, fontData } from "@/app/og/_standings-card";
import { fetchCapperProfile } from "@/lib/api";
import { API_BASE } from "@/lib/config";
import type { VipCapperStatus } from "@/lib/vip/types";
import {
  bestSport,
  exclusivityFor,
  receiptTitle,
  recordText,
  payoutUnits,
  signedOdds,
  signedUnits,
  type PromoKind,
  type VipReceipt,
} from "@/lib/vip/promote";

/* Promote share cards (approved mock 2026-10-30): 1200x675, X's large image.
 * Every number is read from the platform at render time, never from the URL,
 * so a card can only say what the verified record says. */

const W = 1200;
const H = 675;
const TEXT = "#f7f3e9";
const SOFT = "#cfc9bb";
const MUTED = "#71717a";
const POS = "#19f57c";
const VIP_TEXT = "#c4b5fd";
const CACHE = "public, max-age=300, s-maxage=300";

const LEAGUE: Record<string, string> = {
  MLB: "https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png",
  NFL: "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png",
  NBA: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
};

export interface CardData {
  handle: string;
  avatar: string | null;
  status: VipCapperStatus;
  receipt: VipReceipt | null;
}

async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`vip card fetch ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

/** Everything a card needs, or null when the capper, or the receipt asked for, is not there. */
export async function loadCardData(handle: string, kind: PromoKind, ticket: string | null): Promise<CardData | null> {
  let profile;
  try {
    profile = await fetchCapperProfile(handle, { summary: true });
  } catch (err) {
    if (err instanceof Error && err.message === "not_found") return null;
    throw err;
  }
  const id = profile.capper.id;
  const status = await getJson<VipCapperStatus>(`/api/vip/cappers/${id}`);
  if (!status) return null;
  let receipt: VipReceipt | null = null;
  if (kind === "receipt") {
    const r = await getJson<{ receipts: VipReceipt[] }>(`/api/vip/cappers/${id}/receipts`);
    // Only a ticket the platform lists as a revealed win can be drawn.
    receipt = r?.receipts.find((x) => x.ticket_id === ticket) ?? null;
    if (!receipt) return null;
  }
  return {
    handle: profile.capper.handle ?? handle,
    avatar: await avatarDataUri(bigAvatarUrl(profile.capper.profile_image_url)),
    status,
    receipt,
  };
}

function etTime(iso: string, withDate: boolean): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
  if (!withDate) return `${time} ET`;
  const day = d.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
  return `${day}, ${time} ET`;
}

function Avatar({ src, handle, size }: { src: string | null; handle: string; size: number }) {
  const ring = { width: size, height: size, borderRadius: size, border: `4px solid ${VIP_TEXT}` };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} width={size} height={size} style={{ ...ring, objectFit: "cover" }} alt="" />;
  }
  return (
    <div
      style={{
        ...ring,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1b1030",
        fontSize: Math.round(size * 0.4),
        fontWeight: 800,
        color: TEXT,
      }}
    >
      {handle.slice(0, 2).toUpperCase()}
    </div>
  );
}

function Eyebrow({ children }: { children: string }) {
  return <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 6, color: VIP_TEXT }}>{children}</span>;
}

function Logo({ src, height = 44 }: { src: string | null; height?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} height={height} style={{ height }} alt="TailSlips" /> : <span style={{ fontSize: 28, fontWeight: 800, color: TEXT }}>TAILSLIPS</span>;
}

const frame = (background: string) => ({
  width: W,
  height: H,
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
  padding: 64,
  background,
  color: TEXT,
  fontFamily: "Manrope",
});

function BrandCard(d: CardData, logo: string | null, crown: string | null) {
  const sport = bestSport(d.status.eligibility);
  const ex = sport ? exclusivityFor(d.status, String(sport.sport)) : null;
  return (
    <div
      style={frame(
        "radial-gradient(90% 120% at 100% 0%, rgba(196,181,253,0.22) 0%, rgba(0,0,0,0) 55%), linear-gradient(135deg, #2e1065 0%, #160a2b 50%, #0a0a0c 100%)",
      )}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {crown && <img src={crown} height={56} style={{ height: 56, marginRight: 18 }} alt="" />}
          <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: 7 }}>TAILSLIPS</span>
          <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: 7, color: VIP_TEXT, marginLeft: 14 }}>VIP</span>
        </div>
        {ex && (
          <span
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 3,
              padding: "8px 20px",
              borderRadius: 12,
              border: `2px solid ${VIP_TEXT}`,
              color: VIP_TEXT,
            }}
          >
            {ex.toUpperCase()}
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 100, fontWeight: 800, lineHeight: 0.98, letterSpacing: -2 }}>The source of truth</span>
        <span style={{ fontSize: 100, fontWeight: 800, lineHeight: 0.98, letterSpacing: -2, color: VIP_TEXT }}>for cappers.</span>
        <span style={{ fontSize: 34, fontWeight: 700, color: SOFT, marginTop: 18 }}>
          Every pick verified before the game. Graded after.
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Avatar src={d.avatar} handle={d.handle} size={84} />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 20 }}>
            <span style={{ fontSize: 40, fontWeight: 800 }}>@{d.handle}</span>
            <span style={{ fontSize: 24, color: SOFT }}>Only winning cappers sell VIP</span>
          </div>
        </div>
        <Logo src={logo} height={48} />
      </div>
    </div>
  );
}

function LaunchCard(d: CardData, logo: string | null, league: string | null) {
  const sport = bestSport(d.status.eligibility);
  const price = d.status.seller?.price_cents != null ? `$${Math.round(d.status.seller.price_cents / 100)}/mo` : null;
  return (
    <div style={frame("linear-gradient(120deg, #4c1d95 0%, #2e1065 55%, #12081f 100%)")}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Eyebrow>NOW SELLING VIP</Eyebrow>
        <Logo src={logo} />
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Avatar src={d.avatar} handle={d.handle} size={150} />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 32 }}>
          <span style={{ fontSize: 72, fontWeight: 800, lineHeight: 1 }}>@{d.handle}</span>
          <span style={{ fontSize: 30, fontWeight: 700, color: SOFT, marginTop: 10 }}>
            {price ? `${price} · picks before the game, by email` : "Picks before the game, by email"}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        {sport ? (
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {league && <img src={league} height={88} style={{ height: 88, marginRight: 24 }} alt="" />}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, color: POS }}>{signedUnits(sport.units ?? 0)}</span>
              <span style={{ fontSize: 26, color: SOFT }}>
                {`${sport.sport} · last 30 days · ${sport.n_picks ?? 0} picks`}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex" }} />
        )}
        <span style={{ fontSize: 24, fontWeight: 800, color: VIP_TEXT }}>Verified on tailslips.com</span>
      </div>
    </div>
  );
}

function ReceiptCard(d: CardData, logo: string | null) {
  const r = d.receipt as VipReceipt;
  const lead = r.legs[0];
  const parlay = r.legs.length > 1;
  const meta = [signedOdds(r.odds), r.units != null ? `${r.units}u` : null].filter(Boolean).join(" · ");
  return (
    <div
      style={frame("radial-gradient(120% 90% at 0% 0%, rgba(109,40,217,0.35) 0%, #0f0f13 55%), linear-gradient(#0f0f13, #0f0f13)")}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Eyebrow>VIP PICK</Eyebrow>
          <span
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 4,
              padding: "4px 16px",
              borderRadius: 10,
              marginLeft: 18,
              background: "rgba(25,245,124,0.14)",
              color: POS,
            }}
          >
            WON
          </span>
        </div>
        <Logo src={logo} />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: SOFT }}>@{d.handle}</span>
        <span style={{ fontSize: parlay ? 72 : 80, fontWeight: 800, lineHeight: 1.04, marginTop: 6 }}>{receiptTitle(r)}</span>
        {parlay ? (
          <span style={{ fontSize: 28, color: SOFT, marginTop: 8 }}>
            {r.legs.slice(0, 4).map((l) => l.selection).join(" · ")}
          </span>
        ) : (
          lead?.matchup && <span style={{ fontSize: 28, color: SOFT, marginTop: 8 }}>{lead.matchup}</span>
        )}
        {meta && <span style={{ fontSize: 36, fontWeight: 700, color: SOFT, marginTop: 10 }}>{meta}</span>}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          borderTop: "1px solid rgba(255,255,255,0.10)",
          paddingTop: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 26, color: SOFT }}>{`Posted ${etTime(r.posted_at, true)}`}</span>
          {r.commence_time && (
            <span style={{ fontSize: 26, color: MUTED }}>{`Game started ${etTime(r.commence_time, false)}`}</span>
          )}
        </div>
        <span style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, color: POS }}>{payoutUnits(r.profit_units)}</span>
      </div>
    </div>
  );
}

function RecordCard(d: CardData, logo: string | null) {
  const rec = d.status.vip_record;
  return (
    <div style={frame("linear-gradient(160deg, #1e0f3a 0%, #0f0f13 60%)")}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Eyebrow>VIP RECORD</Eyebrow>
        <Logo src={logo} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        <span style={{ fontSize: 180, fontWeight: 800, lineHeight: 0.9 }}>{recordText(rec)}</span>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 40, paddingBottom: 16 }}>
          <span style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, color: rec.units >= 0 ? POS : "#ef4444" }}>
            {signedUnits(rec.units)}
          </span>
          <span style={{ fontSize: 28, color: SOFT }}>{`${rec.n} VIP ${rec.n === 1 ? "pick" : "picks"} graded`}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Avatar src={d.avatar} handle={d.handle} size={84} />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 20 }}>
            <span style={{ fontSize: 40, fontWeight: 800 }}>@{d.handle}</span>
            <span style={{ fontSize: 24, color: MUTED }}>Every pick timestamped before the game</span>
          </div>
        </div>
        <span style={{ fontSize: 24, fontWeight: 800, color: VIP_TEXT }}>Verified on tailslips.com</span>
      </div>
    </div>
  );
}

/** True when the card has real data to draw (mirrors postText's nulls). */
export function cardHasData(kind: PromoKind, d: CardData): boolean {
  if (kind === "brand" || kind === "launch") return bestSport(d.status.eligibility) !== null;
  if (kind === "record") return d.status.vip_record.n > 0;
  return d.receipt !== null;
}

export async function renderVipCard(kind: PromoKind, d: CardData): Promise<Response> {
  const sport = bestSport(d.status.eligibility);
  const [m500, m700, m800, logo, crown, league] = await Promise.all([
    fontData("manrope-500.woff"),
    fontData("manrope-700.woff"),
    fontData("manrope-800.woff"),
    fileDataUri("logo-horizontal-aligned-tight.png"),
    kind === "brand" ? fileDataUri("vip-crown-purple.png") : Promise.resolve(null),
    kind === "launch" && sport ? avatarDataUri(LEAGUE[String(sport.sport).toUpperCase()] ?? null) : Promise.resolve(null),
  ]);
  const fonts = [
    m500 && { name: "Manrope", data: m500, weight: 500 as const, style: "normal" as const },
    m700 && { name: "Manrope", data: m700, weight: 700 as const, style: "normal" as const },
    m800 && { name: "Manrope", data: m800, weight: 800 as const, style: "normal" as const },
  ].filter((f): f is NonNullable<typeof f> => Boolean(f));
  const body =
    kind === "brand"
      ? BrandCard(d, logo, crown)
      : kind === "launch"
        ? LaunchCard(d, logo, league)
        : kind === "receipt"
          ? ReceiptCard(d, logo)
          : RecordCard(d, logo);
  return new ImageResponse(body, { width: W, height: H, fonts, headers: { "Cache-Control": CACHE } });
}
