"use client";

/* The selling capper's VIP dashboard card: a status band (selling or not,
 * per-sport chips, Post a VIP pick), three hero numbers (what you make,
 * paying subscribers, VIP record), a subscriber list closed until asked for,
 * and a quiet settings strip (price, book, Stripe, stop). Editors open under
 * the strip. Approved mock 2026-10-30. */

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { VipApiError, getVipSellerSubscribers, patchVipSeller, stopVipSelling } from "@/lib/vip/client";
import type { VipCapperStatus, VipEligibility, VipSeller, VipSellerSubscriber } from "@/lib/vip/types";
import { BOOKS, OTHER_BOOK, bookName, defaultBook } from "./builder/books";
import { PriceInput, SELLER_SHARE, parsePriceDollars } from "./SellerSetupCard";
import { EligibilityBadges } from "./EligibilityBadges";
import { SellerStatusBanner } from "./SellerStatusBanner";
import { signedUnits } from "./format";
import { ERROR_TEXT, EYEBROW, INNER_CARD, PRIMARY_BTN, SECONDARY_BTN, SECONDARY_BTN_SM } from "./styles";

const STRIPE_DASHBOARD = "https://dashboard.stripe.com";

const linkBtn =
  "text-[12px] font-semibold text-[var(--color-text-soft)] hover:text-[var(--color-text)]";

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

const STATUS_CHIP: Record<string, string> = {
  active: "Selling",
  onboarding: "Setting up",
  restricted: "On hold",
  stopped: "Stopped",
  disabled: "Off",
};

const PILL = "text-[10px] font-extrabold tracking-[0.1em] uppercase px-2 py-1 rounded-md tabular-nums whitespace-nowrap";
const COUNT_CHIP =
  "text-[11px] font-bold px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.05)] border border-[var(--color-border-h)] text-[var(--color-text-soft)]";
const HERO_NUM = "text-[30px] sm:text-[40px] leading-none font-extrabold tabular-nums";

function Hero({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`px-5 sm:px-6 py-4 sm:py-5 flex flex-col gap-1 min-w-0 ${className}`}>
      <span className={EYEBROW}>{label}</span>
      {children}
    </div>
  );
}

function SubscriberRow({ s }: { s: VipSellerSubscriber }) {
  const initial = (s.username ?? "s").charAt(0).toUpperCase();
  const pill =
    s.status === "paused" ? (
      <span className={`${PILL} border border-[var(--color-border-h)] text-[var(--color-text-soft)]`}>Paused</span>
    ) : s.current_period_end ? (
      s.renews ? (
        <span className={`${PILL} bg-[rgba(25,245,124,0.10)] text-[var(--color-pos)]`}>
          Renews {shortDate(s.current_period_end)}
        </span>
      ) : (
        <span className={`${PILL} border border-[var(--color-border-h)] text-[var(--color-text-soft)]`}>
          Ends {shortDate(s.current_period_end)}
        </span>
      )
    ) : null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[var(--color-border)] last:border-b-0 min-w-0">
      <span
        aria-hidden
        className={`w-7 h-7 shrink-0 rounded-full text-[12px] font-extrabold flex items-center justify-center ${
          s.renews
            ? "bg-[var(--color-vip-soft)] text-[var(--color-vip-text)]"
            : "bg-[rgba(255,255,255,0.06)] text-[var(--color-text-soft)]"
        }`}
      >
        {initial}
      </span>
      <span className="text-[13px] font-bold text-[var(--color-text)] min-w-0 truncate">
        {s.username ? `@${s.username}` : "Subscriber"}
      </span>
      {s.since && <span className="text-[12px] text-[var(--color-text-muted)] whitespace-nowrap">since {shortDate(s.since)}</span>}
      <span className="ml-auto">{pill}</span>
    </div>
  );
}

export function SellerStrip({
  seller,
  token,
  paymentsEnabled,
  onSaved,
  eligibility = [],
  vipRecord = null,
  exclusivity = null,
  postAction = null,
  promote = null,
}: {
  seller: VipSeller;
  token: string | null;
  paymentsEnabled: boolean;
  onSaved: () => void;
  /** Per-sport eligibility from the public status (units for the chips). */
  eligibility?: VipEligibility[];
  vipRecord?: VipCapperStatus["vip_record"] | null;
  /** "1 of 7 eligible NBA cappers", from the public status. */
  exclusivity?: string | null;
  /** The band's main action (Post a VIP pick, or a muted hint). */
  postAction?: ReactNode;
  /** Promote panel, under Subscribers. */
  promote?: ReactNode;
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
  // A newer /me status wins over a stale local override.
  useEffect(() => {
    setStatusOverride(null);
  }, [seller.status]);
  const stopPanelRef = useRef<HTMLDivElement>(null);
  // Read at request time: a token refresh must not refetch.
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    if (stopping) stopPanelRef.current?.focus();
  }, [stopping]);

  // Reloaded when the seller status changes: a stop cancels every renewal.
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
  }, [status]);

  const renewing = subs?.filter((s) => s.renews).length ?? null;
  const paused = subs?.filter((s) => s.status === "paused").length ?? 0;
  const canceling = subs ? subs.length - (renewing ?? 0) - paused : 0;
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
      } else {
        setStopError("Could not stop selling. Try again.");
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
      aria-label={which === "price" ? "Edit price" : "Edit main book"}
      className={linkBtn}
      onClick={() => {
        setDraftPrice(String(price));
        setDraftBook(book);
        setError(null);
        setEditing(editing === which ? null : which);
      }}
    >
      Edit
    </button>
  );

  const live = status !== "stopped" && status !== "disabled";
  const strong = live ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]";

  return (
    <section
      aria-label="Your VIP dashboard"
      className="rounded-xl border border-[var(--color-border-h)] bg-[#0f0f13] overflow-hidden"
    >
      {/* Status band: are you selling, where you qualify, and the one action. */}
      <div
        className={`px-5 sm:px-6 py-4 flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 ${
          live ? "" : "bg-[rgba(255,255,255,0.03)] border-b border-[var(--color-border)]"
        }`}
        style={live ? { background: "linear-gradient(100deg, #4c1d95 0%, #2e1065 60%, #1e0f3a 100%)" } : undefined}
      >
        <div className="flex items-center gap-4 flex-wrap min-w-0">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <span
                className={`text-[11px] font-bold tracking-[0.16em] uppercase ${
                  live ? "text-[var(--color-vip-text)]" : "text-[var(--color-text-muted)]"
                }`}
              >
                Your VIP
              </span>
              <span
                className={`text-[10px] font-extrabold tracking-[0.12em] uppercase px-2 py-0.5 rounded-md ${
                  live
                    ? "bg-[var(--color-text)] text-[var(--color-vip-deep)]"
                    : "border border-[var(--color-border-h)] text-[var(--color-text-soft)]"
                }`}
              >
                {STATUS_CHIP[status] ?? status}
              </span>
            </div>
            {live && (
              <span className="text-[12px] font-semibold text-[var(--color-vip-text)]">
                {exclusivity && <>{exclusivity} · </>}
                <Link
                  href="/vip-rules"
                  className="text-[var(--color-text-muted)] underline decoration-[rgba(196,181,253,0.4)] underline-offset-[3px] hover:text-[var(--color-vip-text)]"
                >
                  What is this?
                </Link>
              </span>
            )}
          </div>
        </div>
        {/* Phone: full width under the sports. sm up: right of the header. */}
        {live && postAction && (
          <div className="order-last sm:order-none sm:col-start-2 sm:row-start-1 [&>button]:w-full sm:[&>button]:w-auto">
            {postAction}
          </div>
        )}
        {live && eligibility.length > 0 && (
          <div className="sm:col-span-2">
            <EligibilityBadges eligibility={eligibility} tiles />
          </div>
        )}
      </div>

      {status !== "active" && (
        <div className="px-5 sm:px-6 pt-4">
          <SellerStatusBanner
            status={status}
            token={token}
            paymentsEnabled={paymentsEnabled}
            onStatusChange={changeStatus}
          />
        </div>
      )}

      {/* Hero numbers */}
      {/* Phone: You make | Subscribers side by side, record full width below. */}
      <div className="grid grid-cols-2 sm:grid-cols-3">
        <Hero label="You make">
          <div className="flex items-baseline gap-1">
            <span className={`${HERO_NUM} ${monthly ? strong : "text-[var(--color-text-muted)]"}`}>
              {monthly !== null ? `$${monthly.toFixed(2)}` : "--"}
            </span>
            <span className="text-[13px] font-semibold text-[var(--color-text-muted)]">/mo</span>
          </div>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            {live ? (
              <>
                After <span className="hidden sm:inline">TailSlips&apos; </span>15%
              </>
            ) : (
              "Nobody renews while stopped"
            )}
            {paymentsEnabled && (
              <>
                {" · "}
                <a
                  href={STRIPE_DASHBOARD}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[var(--color-text-soft)] underline underline-offset-2 decoration-[var(--color-border-h)] hover:text-[var(--color-text)]"
                >
                  Payouts<span className="hidden sm:inline"> in Stripe</span> ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </>
            )}
          </span>
        </Hero>
        <Hero label="Paying subscribers" className="border-l border-[var(--color-border)]">
          <span className={`${HERO_NUM} ${renewing ? strong : "text-[var(--color-text-muted)]"}`}>
            {renewing ?? "--"}
          </span>
          {(paused > 0 || canceling > 0) && (
            <div className="flex gap-1.5 pt-0.5 flex-wrap">
              {paused > 0 && <span className={COUNT_CHIP}>{paused} paused</span>}
              {canceling > 0 && <span className={COUNT_CHIP}>{canceling} canceling</span>}
            </div>
          )}
        </Hero>
        <Hero
          label="VIP record"
          className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-[var(--color-border)]"
        >
          {vipRecord && vipRecord.n > 0 ? (
            <>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className={`${HERO_NUM} text-[var(--color-text)]`}>
                  {vipRecord.wins}-{vipRecord.losses}
                  {vipRecord.pushes > 0 ? `-${vipRecord.pushes}` : ""}
                </span>
                <span
                  className={`text-[20px] font-extrabold tabular-nums ${
                    vipRecord.units >= 0 ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"
                  }`}
                >
                  {signedUnits(vipRecord.units)}
                </span>
              </div>
              <span className="text-[12px] text-[var(--color-text-muted)]">
                {vipRecord.n} VIP {vipRecord.n === 1 ? "pick" : "picks"} graded
              </span>
            </>
          ) : (
            <>
              <span className={`${HERO_NUM} text-[var(--color-text-muted)]`}>0-0</span>
              <span className="text-[12px] text-[var(--color-text-muted)]">No VIP picks graded yet</span>
            </>
          )}
        </Hero>
      </div>

      {/* Subscribers: closed until asked for. */}
      <div className="border-t border-[var(--color-border)]">
        <button
          type="button"
          aria-expanded={showSubs}
          disabled={!subs || subs.length === 0}
          onClick={() => setShowSubs(!showSubs)}
          className="w-full px-5 sm:px-6 py-3 flex items-center gap-3 text-left disabled:cursor-default enabled:hover:bg-[rgba(255,255,255,0.02)]"
        >
          <span className={EYEBROW}>Subscribers</span>
          <span className="text-[13px] font-extrabold tabular-nums text-[var(--color-text)]">
            {subs ? subs.length : "--"}
          </span>
          {subs && subs.length > 0 && (
            <span className="ml-auto text-[12px] font-semibold text-[var(--color-text-soft)]">
              {showSubs ? "Hide ▴" : "View ▾"}
            </span>
          )}
        </button>
        {showSubs && subs && subs.length > 0 && (
          <div className="px-5 sm:px-6 pb-3 flex flex-col">
            <span className="text-[11px] text-[var(--color-text-muted)] pb-1">
              If you go cold, your subscribers stop being charged and their billing dates move out by the days you
              couldn&apos;t post.
            </span>
            {subs.map((s, i) => (
              <SubscriberRow key={`${s.username ?? "sub"}-${i}`} s={s} />
            ))}
          </div>
        )}
      </div>

      {promote}

      {/* Settings: a quiet footer strip; editors open under it. */}
      <div className="border-t border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-5 sm:px-6 py-3 flex items-center gap-x-6 gap-y-2 flex-wrap text-[12px]">
        <span className="flex items-center gap-2">
          <span className="text-[var(--color-text-muted)]">Price</span>
          <b className={`tabular-nums ${strong}`}>${price}/mo</b>
          {edit("price")}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[var(--color-text-muted)]">Main book</span>
          <b className={strong}>{bookName(book)}</b>
          {edit("book")}
        </span>
        {canStop && !stopping && (
          <button
            type="button"
            // Phone: its own row under a divider, well clear of the Edit links.
            className="basis-full sm:basis-auto ml-auto mt-1 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)] text-right text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-neg)]"
            onClick={() => {
              setStopError(null);
              setStopping(true);
            }}
          >
            Stop selling
          </button>
        )}
      </div>

      {(editing || error || stopping) && (
        <div className="px-5 sm:px-6 pb-4 flex flex-col gap-2">
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

          {stopping && (
            <div
              ref={stopPanelRef}
              tabIndex={-1}
              role="group"
              aria-label="Stop selling VIP"
              className={`${INNER_CARD} flex flex-col gap-2 w-full outline-none`}
            >
              <span className="text-[12px] text-[var(--color-text)] font-bold">Stop selling VIP?</span>
              <span className="text-[12px] text-[var(--color-text-soft)]">
                New subscriptions close now and nobody renews. {renewing === null
                  ? "Your current subscribers keep"
                  : renewing === 1
                    ? "Your 1 current subscriber keeps"
                    : `Your ${renewing} current subscribers keep`}{" "}
                access until their period ends. You can start again anytime.
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
    </section>
  );
}
