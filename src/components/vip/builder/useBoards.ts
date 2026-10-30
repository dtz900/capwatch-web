"use client";

/* Board data for the builder: each sport's slate, then every open game's
 * board, the visible day first and the rest in the background. */

import { useCallback, useEffect, useRef, useState } from "react";
import { getVipBoardGame, getVipBoardSlate } from "@/lib/vip/client";
import type { BoardGame, BoardSport } from "@/lib/vip/types";
import { fromBoard, fromSlate, type BuilderGame } from "./adapt";

const CONCURRENCY = 4;

export type BoardStatus = "loading" | "error" | "ready";

export interface Boards {
  games: Partial<Record<BoardSport, BuilderGame[]>>;
  /** Missing while a sport's slate is loading. */
  status: Partial<Record<BoardSport, BoardStatus>>;
  /** Move these games to the front of the load queue. */
  prioritize: (ids: string[]) => void;
}

interface Job {
  sport: BoardSport;
  id: string;
}

/** A load queue with at most CONCURRENCY board reads in flight. */
class BoardQueue {
  jobs: Job[] = [];
  running = 0;
  stopped = false;

  constructor(
    private readonly load: (job: Job) => Promise<BoardGame>,
    private readonly onLoaded: (sport: BoardSport, b: BoardGame) => void,
  ) {}

  push(jobs: Job[]) {
    this.jobs.push(...jobs);
    this.pump();
  }

  front(ids: string[]) {
    const want = new Set(ids);
    this.jobs = [...this.jobs.filter((j) => want.has(j.id)), ...this.jobs.filter((j) => !want.has(j.id))];
  }

  stop() {
    this.stopped = true;
    this.jobs = [];
  }

  private pump() {
    while (!this.stopped && this.running < CONCURRENCY && this.jobs.length > 0) {
      const job = this.jobs.shift()!;
      this.running += 1;
      this.load(job)
        .then((b) => {
          if (!this.stopped) this.onLoaded(job.sport, b);
        })
        .catch((err: unknown) => console.error(`VIP board ${job.sport} ${job.id} failed`, err))
        .finally(() => {
          this.running -= 1;
          this.pump();
        });
    }
  }
}

export function useBoards(sports: BoardSport[], token: string | null): Boards {
  const [games, setGames] = useState<Partial<Record<BoardSport, BuilderGame[]>>>({});
  const [status, setStatus] = useState<Partial<Record<BoardSport, BoardStatus>>>({});
  const queue = useRef<BoardQueue | null>(null);
  // Read at request time: a token refresh must not reload the board.
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const prioritize = useCallback((ids: string[]) => queue.current?.front(ids), []);

  const key = sports.join(",");
  useEffect(() => {
    const q = new BoardQueue(
      (job) => getVipBoardGame(job.sport, job.id, tokenRef.current),
      (sport, b) => {
        const g = fromBoard(b, new Date());
        setGames((all) => ({ ...all, [sport]: (all[sport] ?? []).map((x) => (x.id === g.id ? g : x)) }));
      },
    );
    queue.current = q;
    for (const sport of key ? (key.split(",") as BoardSport[]) : []) {
      getVipBoardSlate(sport, tokenRef.current)
        .then(({ games: slate }) => {
          if (q.stopped) return;
          const now = new Date();
          setGames((all) => ({ ...all, [sport]: slate.map((g) => fromSlate(g, now)) }));
          setStatus((s) => ({ ...s, [sport]: "ready" }));
          q.push(slate.filter((g) => !g.started).map((g) => ({ sport, id: g.game_id })));
        })
        .catch((err: unknown) => {
          console.error(`VIP slate ${sport} failed`, err);
          if (!q.stopped) setStatus((s) => ({ ...s, [sport]: "error" }));
        });
    }
    return () => q.stop();
  }, [key]);

  return { games, status, prioritize };
}
