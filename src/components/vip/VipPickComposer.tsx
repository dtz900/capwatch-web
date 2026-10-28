"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  EMPTY_LEG,
  legToInput,
  parseLineField,
  parseOddsField,
  type LegDraft,
} from "@/lib/legDraft";
import { VipApiError, postVipPick } from "@/lib/vip/client";
import type { VipMe, VipSport } from "@/lib/vip/types";
import { LegEditor, inputCls, labelCls, optionCls } from "./LegEditor";
import { goldBtnCls } from "./SellerSetupCard";

const POSTED_MESSAGE = "Posted. Locked to subscribers until the game starts.";
const POSTED_MS = 5000;
const BOUNDS_MESSAGE = "Check units (0.1 to 10) and odds (100 to 10000 either side).";

export function composerError(err: unknown): string {
  if (err instanceof VipApiError) {
    if (err.status === 409 && err.detail === "game_started") return "That game has already started.";
    if (err.status === 409 && err.detail === "game_start_unknown") {
      return "We could not find a start time for that game. Pick it from the list.";
    }
    if (err.status === 403) return "You are not eligible to post in this sport right now.";
    if (err.status === 400 && err.detail === "leg_missing_game") {
      return "Every leg needs a game from the list.";
    }
    if (err.status === 422) return BOUNDS_MESSAGE;
  }
  return "Could not post the pick. Try again.";
}

function parseUnits(raw: string): number | null {
  const n = Number(raw);
  return raw.trim() !== "" && Number.isFinite(n) && n >= 0.1 && n <= 10 ? n : null;
}

/** Empty is fine; anything typed must be integer American odds, 100 to 10000 either side. */
function oddsFieldOk(raw: string): boolean {
  const v = parseOddsField(raw);
  if (v === null) return true;
  return v !== "invalid" && Math.abs(v) >= 100 && Math.abs(v) <= 10000;
}

const USES_LINE = new Set<LegDraft["type"]>(["spread", "total", "team_runs", "custom"]);

/** Typed values the server would reject or JSON would silently null (NaN). */
function legFieldsOk(leg: LegDraft, checkOdds: boolean): boolean {
  if (checkOdds && !oddsFieldOk(leg.odds)) return false;
  return !USES_LINE.has(leg.type) || parseLineField(leg.line) !== "invalid";
}

/** Everything the market needs is filled in. */
function legComplete(leg: LegDraft): boolean {
  if (leg.selection.trim() === "" || leg.game === null) return false;
  switch (leg.type) {
    case "spread":
      return leg.line.trim() !== "";
    case "total":
    case "team_runs":
      return leg.direction !== "" && leg.line.trim() !== "";
    case "custom":
      return leg.statName.trim() !== "";
    default:
      return true;
  }
}

export function VipPickComposer({ me, onPosted }: { me: VipMe; onPosted: (ids: number[]) => void }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const sports = me.can_post_sports.map((s) => s.toUpperCase() as VipSport);
  const [sport, setSport] = useState<VipSport | null>(sports[0] ?? null);
  const [units, setUnits] = useState("1");
  const [combinedOdds, setCombinedOdds] = useState("");
  const [legs, setLegs] = useState<LegDraft[]>([{ ...EMPTY_LEG }]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped after a post so LegEditor remounts with no game chips or team filter.
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Keep the selected sport inside the allowed list if eligibility changes.
  const activeSport = sport && sports.includes(sport) ? sport : (sports[0] ?? null);

  if (!token) return null;

  if (!activeSport) {
    return (
      <p className="text-[12px] text-[var(--color-text-muted)]">
        You can post VIP picks once a sport is eligible.
      </p>
    );
  }

  const isParlay = legs.length > 1;
  const useCombined = isParlay && combinedOdds.trim() !== "";
  const unitsValue = parseUnits(units);
  const fieldsOk =
    unitsValue !== null &&
    (!useCombined || oddsFieldOk(combinedOdds)) &&
    legs.every((l) => legFieldsOk(l, !useCombined));
  const canSubmit = !pending && fieldsOk && legs.every(legComplete);

  const changeSport = (next: VipSport) => {
    setSport(next);
    setLegs([{ ...EMPTY_LEG }]);
    setCombinedOdds("");
    setError(null);
  };

  const submit = async () => {
    if (unitsValue === null) return;
    setPending(true);
    setError(null);
    setPosted(false);
    try {
      const inputs = legs.map(legToInput).map((l) => (useCombined ? { ...l, odds: null } : l));
      const res = await postVipPick(
        {
          sport: activeSport,
          units: unitsValue,
          combined_odds: useCombined ? Number(combinedOdds) : null,
          legs: inputs,
        },
        token,
      );
      setLegs([{ ...EMPTY_LEG }]);
      setUnits("1");
      setCombinedOdds("");
      setEditorKey((k) => k + 1);
      setPosted(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setPosted(false), POSTED_MS);
      onPosted(res.created_pick_ids);
    } catch (err) {
      if (!(err instanceof VipApiError)) console.error("VIP pick post failed", err);
      setError(composerError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Sport</span>
          <select
            aria-label="Sport"
            className={inputCls}
            value={activeSport}
            onChange={(e) => changeSport(e.target.value as VipSport)}
          >
            {sports.map((s) => (
              <option key={s} value={s} className={optionCls}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Units</span>
          <input
            aria-label="Units"
            type="number"
            step="any"
            className={`${inputCls} w-20`}
            value={units}
            onChange={(e) => setUnits(e.target.value)}
          />
        </label>
        {isParlay && (
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Combined odds</span>
            <input
              aria-label="Combined odds"
              className={`${inputCls} w-28`}
              placeholder="e.g. +260"
              value={combinedOdds}
              onChange={(e) => setCombinedOdds(e.target.value)}
            />
          </label>
        )}
      </div>

      <LegEditor
        key={editorKey}
        sport={activeSport}
        legs={legs}
        onChange={setLegs}
        token={token}
        legOddsDisabled={useCombined}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" className={goldBtnCls} disabled={!canSubmit} onClick={submit}>
          Post VIP pick
        </button>
        {!fieldsOk && (
          <span className="text-[11px] text-[#f87171] font-semibold">{BOUNDS_MESSAGE}</span>
        )}
        {error && <span className="text-[11px] text-[#f87171] font-semibold">{error}</span>}
        {posted && <span className="text-[11px] text-[#4ade80] font-semibold">{POSTED_MESSAGE}</span>}
      </div>
    </div>
  );
}
