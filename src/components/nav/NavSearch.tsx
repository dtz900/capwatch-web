"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { CapperAvatar } from "@/components/leaderboard/CapperAvatar";
import { API_BASE } from "@/lib/config";
import type { LeaderboardResponse } from "@/lib/types";

interface SearchOption {
  handle: string;
  displayName: string | null;
  profileImageUrl: string | null;
  picksCount: number;
}

const MAX_RESULTS = 8;

/**
 * Nav-bar search: click the icon, popover opens with an input that fuzzy-
 * matches against tracked capper handles and display names. Click a result
 * to navigate to that capper's profile. Capper list is fetched once on first
 * open and cached for the session.
 */
export function NavSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function loadOptionsIfNeeded() {
    if (options !== null || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/public/cappers?window=all_time&sort=units_profit&bet_type=all&min_picks=0&active_only=false`,
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as LeaderboardResponse;
      const opts = data.leaderboard
        .filter((r) => r.handle)
        .map<SearchOption>((r) => ({
          handle: r.handle as string,
          displayName: r.display_name,
          profileImageUrl: r.profile_image_url,
          picksCount: r.picks_count,
        }));
      setOptions(opts);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    setActiveIndex(0);
    if (next) loadOptionsIfNeeded();
  }

  useEffect(() => {
    if (open) {
      // Defer focus so the popover is mounted first
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const results = useMemo(() => {
    if (!options) return [];
    const q = query.toLowerCase().trim();
    if (!q) {
      return options.slice(0, MAX_RESULTS);
    }
    return options
      .filter((o) => {
        const handleMatch = o.handle.toLowerCase().includes(q);
        const nameMatch = o.displayName ? o.displayName.toLowerCase().includes(q) : false;
        return handleMatch || nameMatch;
      })
      .slice(0, MAX_RESULTS);
  }, [options, query]);

  function handleInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) {
        window.location.href = `/cappers/${r.handle}`;
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Search cappers"
        aria-expanded={open}
        className="w-9 h-9 flex items-center justify-center
                   border border-[rgba(255,255,255,0.06)] rounded-lg
                   text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                   hover:border-[rgba(255,255,255,0.10)] transition-colors"
      >
        <SearchIcon />
      </button>

      {open && (
        <div
          className="absolute top-11 right-0
                     w-[calc(100vw-2rem)] sm:w-[360px] max-w-[420px]
                     bg-[#0e0e12] border border-[rgba(255,255,255,0.10)]
                     rounded-xl shadow-2xl shadow-black/40 overflow-hidden
                     z-40"
          role="dialog"
          aria-label="Search cappers"
        >
          <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-2">
            <SearchIcon className="text-[var(--color-text-muted)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleInputKey}
              placeholder="Search cappers by handle or name"
              className="flex-1 bg-transparent text-[14px] text-[var(--color-text)]
                         placeholder:text-[var(--color-text-muted)] outline-none"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && options === null ? (
              <div className="px-4 py-6 text-[13px] text-[var(--color-text-muted)] text-center">
                Loading cappers…
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-6 text-[13px] text-[var(--color-text-muted)] text-center">
                No cappers match.
              </div>
            ) : (
              results.map((r, i) => (
                <Link
                  key={r.handle}
                  href={`/cappers/${r.handle}`}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex items-center gap-3 px-3 py-2.5 ${
                    activeIndex === i ? "bg-[rgba(255,255,255,0.04)]" : ""
                  }`}
                >
                  <CapperAvatar
                    url={r.profileImageUrl}
                    handle={r.handle}
                    size={32}
                    apiIntegrated={r.handle === "fadeai_"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-[var(--color-text)] truncate">
                      {r.displayName ?? r.handle}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                      @{r.handle} · {r.picksCount} picks
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
