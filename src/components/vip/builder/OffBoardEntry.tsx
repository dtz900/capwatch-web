"use client";

/* "Bet not on the board": the bet as the capper's book wrote it ("CHA
 * 112-108 exact score"), on a game from the board. It goes out to
 * subscribers at once and counts on the record only after the nightly
 * review (decision 2026-10-30). Markup from the approved mock. */

import { useState } from "react";
import { EYEBROW, INNER_CARD, SECONDARY_BTN_SM } from "@/components/vip/styles";
import type { BoardSide } from "@/lib/vip/types";
import type { BuilderGame } from "./adapt";
import { parsePrice } from "./odds";
import type { SlipLeg } from "./slip";

export const OFFBOARD_STAT = "offboard";
export const OFFBOARD_TEXT_MAX = 200;

let seq = 0;

export function offBoardLeg(g: BuilderGame, text: string, price: string): SlipLeg {
  const american = parsePrice(price) as number;
  const sel = text.trim();
  const side: BoardSide = {
    key: `offboard:${++seq}`,
    label: sel,
    short: "",
    price: american,
    quotes: {},
    best: american,
    best_book: null,
    leg: {
      sport: g.sport, game_id: g.id, stat_name: OFFBOARD_STAT, selection: sel, line: null,
      direction: null, player_id: null, player_name: null,
    },
  };
  return {
    side,
    game: g.slate,
    price: price.trim(),
    american,
    edited: true,
    manual: { selection: sel, game_id: g.id, offboard: true },
  };
}

const gameKeyOf = (g: BuilderGame) => `${g.sport}:${g.id}`;

export function OffBoardEntry({
  games,
  onAdd,
}: {
  /** Open games across the board's sports, soonest first. */
  games: BuilderGame[];
  /** False when the slip could not take it; the text stays. */
  onAdd: (legs: SlipLeg[]) => boolean;
}) {
  const [open, setOpen] = useState(false);
  // "SPORT:id". Never defaulted: boards land one at a time, and a game that
  // starts drops off, so a fallback would move a written bet onto another game.
  const [gameKey, setGameKey] = useState("");
  const [text, setText] = useState("");
  const [price, setPrice] = useState("");
  const g = games.find((x) => gameKeyOf(x) === gameKey);
  const p = parsePrice(price);
  const field =
    "h-9 px-2.5 text-[12px] rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text)] focus:outline-none";
  if (games.length === 0) return null;
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-[11px] font-semibold text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
      >
        Bet not on the board?
      </button>
    );
  }
  const ready = !!g && text.trim() !== "" && text.trim().length <= OFFBOARD_TEXT_MAX && p !== null;
  return (
    <div className={`${INNER_CARD} flex flex-col gap-2`}>
      <span className={EYEBROW}>Bet not on the board</span>
      <div className="flex flex-col sm:flex-row gap-2">
        <select aria-label="Game" className={field} value={g ? gameKey : ""} onChange={(e) => setGameKey(e.target.value)}>
          <option value="" disabled className="bg-[#0e0e12]">
            Pick a game
          </option>
          {games.map((x) => (
            <option key={gameKeyOf(x)} value={gameKeyOf(x)} className="bg-[#0e0e12]">
              {x.sport} · {x.away} @ {x.home} · {x.day} {x.time}
            </option>
          ))}
        </select>
        <input
          aria-label="Bet as written"
          placeholder='As your book wrote it, e.g. "LaMelo 3+ steals"'
          maxLength={OFFBOARD_TEXT_MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`${field} flex-1`}
        />
        <input aria-label="Price" placeholder="price" value={price} onChange={(e) => setPrice(e.target.value)} className={`${field} w-24`} />
      </div>
      <p className="text-[11px] text-[var(--color-text-muted)]">
        Goes out to subscribers right away. We check it before it counts on your record.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className={SECONDARY_BTN_SM}
          disabled={!ready}
          onClick={() => {
            if (!g || !onAdd([offBoardLeg(g, text, price)])) return;
            setText("");
            setPrice("");
            setOpen(false);
          }}
        >
          Add to slip
        </button>
        <button type="button" className={SECONDARY_BTN_SM} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
