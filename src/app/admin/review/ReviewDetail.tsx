"use client";

import { Fragment, useState, type ReactNode } from "react";
import type { RawSibling } from "@/lib/api";
import type { MarketDef, PickPatchInput } from "../audit/actions";
import { GameEditor } from "../audit/editors/GameEditor";
import { MarketEditor } from "../audit/editors/MarketEditor";
import { PlayerEditor } from "../audit/editors/PlayerEditor";
import { SportEditor } from "../audit/editors/SportEditor";
import { TextEditor } from "../audit/editors/TextEditor";
import { FieldRow, LABEL_CLASS, ROW_CLASS } from "../audit/FieldRow";
import { effectiveStates, type FieldKey } from "../audit/fieldState";
import type { PickHint } from "../audit/usePatchFlow";
import { TweetBlock } from "../audit/TweetBlock";
import { FromThisTweet } from "./FromThisTweet";
import { formatOdds, markTweetLine } from "./reviewLabels";
import type { ReviewRow } from "./reviewRow";

export interface ReviewDetailProps {
  p: ReviewRow;
  index: number;
  total: number;
  markets: MarketDef[] | null | string;
  hint: PickHint | undefined;
  pending: boolean;
  fixedKeys: FieldKey[];
  onPatch: (patch: PickPatchInput, okMessage: string, propagate?: boolean, hint?: PickHint) => Promise<void>;
  onRetryMarkets: () => void;
  heldSiblings: ReviewRow[];
  tracked: RawSibling[];
  groupSelected: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onSelectGroup: (on: boolean) => void;
}

const KBD = "border border-[var(--color-border)] rounded px-[5px] text-[10px] font-bold text-[var(--color-text-soft)]";
const START_VERB: Record<string, string> = { NBA: "tips", NCAAB: "tips", NFL: "kicks", MLB: "first pitch" };

function TimingLine({ p }: { p: ReviewRow }) {
  const verdict =
    p.started_minutes != null ? (
      <span className="font-extrabold text-[var(--color-neg)]">{`Started ${p.started_minutes} min before the tweet`}</span>
    ) : p.game_id == null && p.parlay_id == null ? (
      <span className="font-extrabold text-[var(--color-neg)]">No game bound</span>
    ) : (
      <span className="font-extrabold text-[var(--color-pos)]">Pregame</span>
    );
  const verb = START_VERB[p.sport ?? ""] ?? "starts";
  return (
    <div className="mt-3 text-[12.5px] font-semibold text-[var(--color-text-muted)]">
      {verdict}
      {p.game_label && ` · ${p.game_label}${p.tip_label ? ` ${verb} ${p.tip_label} PT` : ""}`}
      {p.posted_label && ` · tweeted ${p.posted_label} PT`}
    </div>
  );
}

function markedTweet(selection: string | null) {
  return function render(text: string): ReactNode {
    return markTweetLine(text, selection).map((l, i) => (
      <Fragment key={i}>
        {i > 0 && "\n"}
        {l.marked ? (
          <mark className="bg-[rgba(247,243,233,0.14)] text-[var(--color-text)] rounded px-[3px]">{l.line}</mark>
        ) : (
          l.line
        )}
      </Fragment>
    ));
  };
}

export function ReviewDetail(props: ReviewDetailProps) {
  const { p, index, total, markets, hint, pending, fixedKeys, onPatch, onRetryMarkets } = props;
  const [open, setOpen] = useState<Partial<Record<FieldKey, boolean>>>({});
  const marketsError = typeof markets === "string";
  const states = effectiveStates(p, Array.isArray(markets) ? markets : null, fixedKeys, null, {
    mode: "review",
    playerMismatch: p.player_mismatch,
    gameLabel: p.game_label,
    marketsError,
  });
  const ed = { p, disabled: pending, onPatch };
  const editorFor = (k: FieldKey) => {
    switch (k) {
      case "player":
        return <PlayerEditor {...ed} />;
      case "game":
        return <GameEditor {...ed} pickedTeam={hint?.team ?? null} />;
      case "market":
        return <MarketEditor {...ed} markets={markets} />;
      case "line":
        return <TextEditor {...ed} field="line" />;
      case "odds":
        return <TextEditor {...ed} field="odds_taken" />;
      case "stake":
        return <TextEditor {...ed} field="units" />;
    }
  };
  // open[k] is undefined until the user toggles; the Game editor then defaults to open while red.
  const isOpen = (k: FieldKey, red: boolean) => open[k] ?? (k === "game" && red);
  const toggle = (k: FieldKey, red: boolean) => setOpen((o) => ({ ...o, [k]: !isOpen(k, red) }));

  return (
    <div className="max-w-[900px] w-full px-8 pt-[22px] pb-10">
      <div className="flex items-center gap-[14px]">
        <span className="bg-[var(--color-text)] text-[#0a0a0c] text-[10px] font-extrabold tracking-[0.06em] rounded-[5px] text-center py-[5px] w-[50px]">
          {p.sport ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[26px] font-extrabold tracking-[-0.02em] leading-[1.1]">
            {p.selection ?? p.market ?? "Untitled pick"}
            {p.odds_taken != null && (
              <span className="ml-2 text-[20px] font-bold text-[var(--color-text-soft)] tabular-nums">
                {formatOdds(p.odds_taken)}
              </span>
            )}
          </div>
          <div className="mt-[5px] text-[12.5px] font-semibold text-[var(--color-text-muted)]">
            {p.reason_label && <span className="font-extrabold text-[var(--color-text-soft)]">{p.reason_label}</span>}
            {p.reason_label && " · "}
            {p.capper_display_name ?? p.capper_handle ?? "Unknown"}
            {p.capper_handle ? ` @${p.capper_handle}` : ""}
            {` · pick #${p.pick_id}`}
            {p.parlay_id != null ? ` · parlay #${p.parlay_id}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--color-text-muted)]">
          <span>{`${index + 1} of ${total}`}</span>
          <kbd className={KBD}>K</kbd>
          <kbd className={KBD}>J</kbd>
        </div>
      </div>

      <TimingLine p={p} />
      <TweetBlock p={p} renderText={markedTweet(p.selection)} />
      <FromThisTweet
        current={p}
        held={props.heldSiblings}
        tracked={props.tracked}
        groupSelected={props.groupSelected}
        pending={pending}
        onApprove={props.onApprove}
        onReject={props.onReject}
        onApproveAll={props.onApproveAll}
        onRejectAll={props.onRejectAll}
        onSelectGroup={props.onSelectGroup}
      />

      <div className="mt-5 border-t border-[var(--color-border)]">
        <div className={ROW_CLASS}>
          <div className={LABEL_CLASS}>Sport</div>
          <SportEditor {...ed} />
          <span className="text-[11.5px] font-semibold text-[var(--color-text-muted)]">
            Rosters, games and markets follow this
          </span>
        </div>
        {markets === null ? (
          <div className="py-[11px] text-[12px] font-semibold text-[var(--color-text-muted)]">Loading markets...</div>
        ) : (
          states.map((s) => (
            <div key={s.key}>
              <FieldRow state={s} open={isOpen(s.key, s.red)} onToggle={() => toggle(s.key, s.red)}>
                {editorFor(s.key)}
              </FieldRow>
              {s.key === "market" && marketsError && (
                <div className="flex items-center gap-3 pb-2 text-[12px] font-semibold text-[var(--color-neg)]">
                  <span>Markets failed to load: {markets}</span>
                  <button
                    type="button"
                    onClick={onRetryMarkets}
                    className="border border-[var(--color-border)] rounded-md px-2.5 py-[3px] text-[11.5px] font-extrabold text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
