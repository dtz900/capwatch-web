"use client";

/* The selling capper's stats card above the pick builder: price, main book,
 * subscribers, this month. One card split by hairlines (2x2 on phones, one
 * row from lg); editors open in a panel under it so the grid never reflows.
 * Markup from the approved SellerStripMock. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { VipApiError, getVipSellerSubscribers, patchVipSeller, stopVipSelling } from "@/lib/vip/client";
import type { VipSeller, VipSellerSubscriber } from "@/lib/vip/types";
import { BOOKS, OTHER_BOOK, bookName, defaultBook } from "./builder/books";
import { PriceInput, SELLER_SHARE, parsePriceDollars } from "./SellerSetupCard";
import { SellerStatusBanner } from "./SellerStatusBanner";
import { ERROR_TEXT, EYEBROW, INNER_CARD, PRIMARY_BTN, SECONDARY_BTN, SECONDARY_BTN_SM } from "./styles";

function Tile({ label, children, action }: { label: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="bg-[var(--color-bg-card)] px-3.5 py-3 sm:px-4 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className={EYEBROW}>{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

const linkBtn =
  "text-[11px] font-bold text-[var(--color-text-soft)] hover:text-[var(--color-text)] underline underline-offset-2 decoration-[var(--color-border-h)]";

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

export function SellerStrip({
  seller,
  token,
  paymentsEnabled,
  onSaved,
}: {
  seller: VipSeller;
  token: string | null;
  paymentsEnabled: boolean;
  onSaved: () => void;
}) {
  const price = Math.round(seller.price_cents / 100);
  const book = defaultBook(seller.preferred_book);
  const [editing, setEditing] = useState<null | "price" | "book">(null);
  const [draftPrice, setDraftPrice] = useState(String(price));
  const [draftBook, setDraftBook] = useState(book);
  const [showSubs, setShowSubs] = useState(false);
  const [subs, setSubs] = useState<VipSellerSubscriber[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);
  // Status the API last returned; wins over the prop until /me catches up.
  const [statusOverride, setStatusOverride] = useState<string | null>(null);
  const status = statusOverride ?? seller.status;
  // Read at request time: a token refresh must not refetch.
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    getVipSellerSubscribers(tokenRef.current)
      .then((r) => {
        if (!cancelled) setSubs(r.subscribers);
      })
      .catch((err: unknown) => console.error("VIP subscribers failed", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const renewing = subs?.filter((s) => s.renews).length ?? null;
  const canceling = subs ? subs.length - (renewing ?? 0) : 0;
  const monthly = renewing !== null ? renewing * price * SELLER_SHARE : null;
  const draft = parsePriceDollars(draftPrice);

  const save = async (body: { price_cents?: number; preferred_book?: string }) => {
    setPending(true);
    setError(null);
    try {
      await patchVipSeller(body, tokenRef.current);
      setEditing(null);
      onSaved();
    } catch (err) {
      console.error("VIP seller update failed", err);
      setError("Could not save. Try again.");
    } finally {
      setPending(false);
    }
  };

  const stop = async () => {
    if (pending) return;
    setPending(true);
    setStopError(null);
    try {
      const r = await stopVipSelling(tokenRef.current);
      if (r.status === "stopped") {
        setStopping(false);
        setStatusOverride("stopped");
        onSaved();
      }
    } catch (err) {
      console.error("VIP stop selling failed", err);
      setStopError(
        err instanceof VipApiError && err.detail === "stop_incomplete"
          ? "Some subscriptions didn't cancel yet. Try again."
          : "Could not stop selling. Try again.",
      );
    } finally {
      setPending(false);
    }
  };

  const changeStatus = (next: string) => {
    setStatusOverride(next);
    onSaved();
  };

  const canStop = status === "active" || status === "restricted" || status === "onboarding";

  const edit = (which: "price" | "book") => (
    <button
      type="button"
      className={linkBtn}
      onClick={() => {
        setDraftPrice(String(price));
        setDraftBook(book);
        setError(null);
        setEditing(which);
      }}
    >
      Edit
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <SellerStatusBanner
        status={status}
        token={token}
        paymentsEnabled={paymentsEnabled}
        onStatusChange={changeStatus}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)]">
        <Tile label="Price" action={editing !== "price" && edit("price")}>
          <span className="text-[20px] font-extrabold tabular-nums leading-none text-[var(--color-text)]">
            ${price}
            <span className="text-[12px] font-semibold text-[var(--color-text-muted)]">/mo</span>
          </span>
        </Tile>

        <Tile label="Main book" action={editing !== "book" && edit("book")}>
          <span className="text-[17px] leading-none font-extrabold text-[var(--color-text)] truncate">{bookName(book)}</span>
        </Tile>

        <Tile
          label="Subscribers"
          action={
            subs && subs.length > 0 && (
              <button type="button" className={linkBtn} onClick={() => setShowSubs(!showSubs)}>
                {showSubs ? "Hide" : "View"}
              </button>
            )
          }
        >
          <span className="text-[20px] font-extrabold tabular-nums leading-none text-[var(--color-text)]">
            {renewing ?? "--"}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            active{canceling > 0 ? ` · ${canceling} canceling` : ""}
          </span>
          <span className="text-[10px] leading-snug text-[var(--color-text-muted)]">
            If you go cold, your subscribers stop being charged and their billing dates move out by the days you
            couldn&apos;t post.
          </span>
        </Tile>

        <Tile label="Per month">
          <span className="text-[20px] font-extrabold tabular-nums leading-none text-[var(--color-text)]">
            {monthly !== null ? `$${monthly.toFixed(2)}` : "--"}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            TailSlips share already removed
          </span>
        </Tile>
      </div>

      {editing === "price" && (
        <div className={`${INNER_CARD} flex flex-col gap-2`}>
          <PriceInput id="strip-price" value={draftPrice} onChange={setDraftPrice} />
          {draft !== null && draft !== price && (renewing ?? 0) > 0 && (
            <span className="text-[11px] text-[var(--color-text-soft)]">
              Your {renewing} current subscribers stay at ${price}. New subscribers pay ${draft}.
            </span>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className={SECONDARY_BTN_SM}
              disabled={draft === null || pending}
              onClick={() => draft !== null && save({ price_cents: draft * 100 })}
            >
              Save
            </button>
            <button type="button" className={SECONDARY_BTN_SM} onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {editing === "book" && (
        <div className={`${INNER_CARD} flex flex-col gap-2`}>
          <select
            aria-label="Main book"
            value={draftBook}
            onChange={(e) => setDraftBook(e.target.value)}
            className="h-9 px-2 text-[12px] rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text)] focus:outline-none"
          >
            {BOOKS.map((b) => (
              <option key={b.id} value={b.id} className="bg-[#0e0e12]">
                {b.name}
              </option>
            ))}
            <option value={OTHER_BOOK} className="bg-[#0e0e12]">
              Other book
            </option>
          </select>
          <span className="text-[11px] text-[var(--color-text-muted)]">New picks prefill at this book.</span>
          <div className="flex gap-2">
            <button
              type="button"
              className={SECONDARY_BTN_SM}
              disabled={pending}
              onClick={() => save({ preferred_book: draftBook })}
            >
              Save
            </button>
            <button type="button" className={SECONDARY_BTN_SM} onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <span role="status" className={ERROR_TEXT}>
          {error}
        </span>
      )}

      {showSubs && subs && (
        <div className={`${INNER_CARD} flex flex-col`}>
          {subs.map((s, i) => (
            <div
              key={`${s.username ?? "sub"}-${i}`}
              className="flex items-center gap-3 py-2 border-b border-[var(--color-border)] last:border-b-0 text-[12px]"
            >
              <span className="font-bold text-[var(--color-text)] min-w-0 truncate">
                {s.username ? `@${s.username}` : "Subscriber"}
              </span>
              {s.since && <span className="text-[var(--color-text-muted)]">since {shortDate(s.since)}</span>}
              <span className="ml-auto text-[var(--color-text-soft)] tabular-nums">
                {s.current_period_end ? `${s.renews ? "Renews" : "Ends"} ${shortDate(s.current_period_end)}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {canStop && (
        <div className="flex items-center gap-3 flex-wrap">
          {!stopping ? (
            <button
              type="button"
              className={`${linkBtn} ml-auto`}
              onClick={() => {
                setStopError(null);
                setStopping(true);
              }}
            >
              Stop selling
            </button>
          ) : (
            <div className={`${INNER_CARD} flex flex-col gap-2 w-full`}>
              <span className="text-[12px] text-[var(--color-text)] font-bold">Stop selling VIP?</span>
              <span className="text-[12px] text-[var(--color-text-soft)]">
                New subscriptions close now and nobody renews. Your {renewing ?? 0} current subscribers keep access
                until their period ends. You can start again anytime.
              </span>
              <div className="flex gap-2">
                <button type="button" className={PRIMARY_BTN} disabled={pending} onClick={stop}>
                  Stop selling
                </button>
                <button type="button" className={SECONDARY_BTN} onClick={() => setStopping(false)}>
                  Keep selling
                </button>
              </div>
              {stopError && (
                <span role="status" className={ERROR_TEXT}>
                  {stopError}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
