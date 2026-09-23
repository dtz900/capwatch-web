"use client";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { nextUsernameChange, validateUsername } from "@/lib/tof/username";
import { VerifyWithX } from "@/components/auth/VerifyWithX";

/* One modal, mounted once in the root layout. requireUsername() is the gate
   every play goes through: a user with a name passes straight through, a
   user without one sees the claim modal and the promise settles on claim or
   dismiss. The DB trigger is the authority on reserved names and the 30-day
   window; this is the friendly layer. */

interface ClaimCtx {
  requireUsername: () => Promise<boolean>;
  openChange: () => void;
}

const Ctx = createContext<ClaimCtx>({ requireUsername: async () => false, openChange: () => {} });

export function useUsernameClaim(): ClaimCtx {
  return useContext(Ctx);
}

type Mode = "claim" | "change";

export function UsernameClaimProvider({ children }: { children: ReactNode }) {
  const { session, profile, refreshProfile, suggestedUsername } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("claim");
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  // A second requireUsername() call while the modal is already open (waiting
  // on the first) reuses this promise instead of overwriting `resolver`,
  // which would otherwise orphan the first caller's promise forever. Both
  // callers settle together: true on a successful claim, false on dismiss.
  const pending = useRef<Promise<boolean> | null>(null);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    pending.current = null;
    setOpen(false);
  }, []);

  const requireUsername = useCallback(async () => {
    if (!session?.user?.id) return false;
    if (profile?.username) return true;
    if (pending.current) return pending.current;
    setMode("claim");
    setOpen(true);
    const promise = new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
    pending.current = promise;
    return promise;
  }, [session, profile]);

  const openChange = useCallback(() => {
    setMode("change");
    setOpen(true);
  }, []);

  // A sign-out (or an expired session) while the modal is up unmounts it
  // below, which would leave requireUsername()'s promise pending forever and
  // wedge every later call behind `pending`. Settle it false and close.
  const userId = session?.user?.id ?? null;
  // After an X verification the claim function sets the username while the
  // replay effect may already have re-opened this modal; a claim modal for a
  // user who now has a name closes itself and settles true.
  const hasName = Boolean(profile?.username);
  useEffect(() => {
    // Same side-effect-on-a-caller shape as the sign-out settle below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && mode === "claim" && hasName) settle(true);
  }, [open, mode, hasName, settle]);
  useEffect(() => {
    // Settling an outstanding promise is a side effect on a caller outside
    // React, not derived state, and there is no render-time place to do it.
    // Same pattern (and same pre-existing lint debt) as AuthProvider's
    // loadProfile() effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && !userId) settle(false);
  }, [open, userId, settle]);

  const value = useMemo(() => ({ requireUsername, openChange }), [requireUsername, openChange]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {open && session?.user?.id && (
        <UsernameModal
          mode={mode}
          userId={session.user.id}
          currentName={profile?.username ?? null}
          changedAt={profile?.username_changed_at ?? null}
          suggestedName={mode === "claim" ? suggestedUsername : null}
          onDone={async () => {
            await refreshProfile();
            settle(true);
          }}
          onDismiss={() => settle(false)}
        />
      )}
    </Ctx.Provider>
  );
}

type Availability = "idle" | "checking" | "available" | "taken";

function UsernameModal({
  mode, userId, currentName, changedAt, suggestedName, onDone, onDismiss,
}: {
  mode: Mode;
  userId: string;
  currentName: string | null;
  changedAt: string | null;
  suggestedName: string | null;
  onDone: () => Promise<void>;
  onDismiss: () => void;
}) {
  const supabase = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? createBrowserSupabase()
        : null,
    [],
  );
  // A linked X handle (non-capper) is offered as the value until the user
  // types. Derived, not initialized: after the OAuth return the modal can
  // mount before tof_claim_x_identity() has answered, so the suggestion
  // often arrives later.
  const [typed, setTyped] = useState<string | null>(null);
  const value = typed ?? suggestedName ?? "";
  // Local validation is a pure function of `value`, so it's derived during
  // render rather than mirrored into state via an effect.
  const localCheck = useMemo(() => validateUsername(value), [value]);
  const localError = value && !localCheck.ok ? localCheck.reason : null;
  const eligible = Boolean(value) && localCheck.ok && Boolean(supabase);
  const [availability, setAvailability] = useState<Availability>("idle");
  // Fold stale results back to "idle" without a reset effect: whatever the
  // last debounced check found, it no longer applies once the field holds
  // something that isn't currently checkable.
  const displayAvailability: Availability = eligible ? availability : "idle";
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const nextChange = mode === "change" ? nextUsernameChange(changedAt) : null;
  const headingId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // The modal takes focus when it opens and hands it back to whatever had it
  // when it closes, so a keyboard user is not dropped at the top of the page.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    if (!eligible || !supabase) return;
    const client = supabase;
    let cancelled = false;
    // Every setState call below runs inside the timer/async callback, never
    // synchronously in the effect body, so a debounce restart never forces
    // an extra render pass on its own.
    const id = setTimeout(() => {
      setAvailability("checking");
      void (async () => {
        const { data, error } = await client.rpc("tof_username_available", { candidate: value });
        if (cancelled) return;
        if (error) {
          setAvailability("idle");
          setServerError("Could not check that name. Try again.");
          return;
        }
        setServerError(null);
        setAvailability(data ? "available" : "taken");
      })();
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [eligible, value, supabase]);

  const canClaim = !busy && !localError && displayAvailability === "available" && !nextChange;

  async function claim() {
    if (!supabase || !canClaim) return;
    setBusy(true);
    setServerError(null);
    const { error } = await supabase.from("ts_profiles").update({ username: value }).eq("user_id", userId);
    if (error) {
      setBusy(false);
      // Only a verdict about the name itself invalidates the availability
      // check. A save that failed for any other reason (network, 500) says
      // nothing about it, and clearing availability there would disable the
      // button for good: the debounce effect never re-runs on an unchanged
      // field, so there would be no way back to "available".
      if (/reserved/i.test(error.message)) {
        setServerError("That name is reserved.");
        setAvailability("idle");
      } else if (/30 days/i.test(error.message)) {
        setServerError("You can change your username once every 30 days.");
        setAvailability("idle");
      } else if (/duplicate|unique/i.test(error.message)) {
        setServerError("Someone just took that name.");
        setAvailability("idle");
      } else {
        setServerError("Could not save that name. Try again.");
      }
      return;
    }
    await onDone();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(10,10,12,0.85)] px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onDismiss();
        }
      }}
    >
      <div className="w-full max-w-[440px] rounded-xl border border-[var(--color-border-h)] bg-gradient-to-b from-[#17171d] to-[#101015] p-7 shadow-2xl">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-pos)]">
          {mode === "change" ? "Account" : "Before your first swipe"}
        </div>
        <h2 id={headingId} className="mt-1.5 text-[26px] font-extrabold tracking-[-0.03em] leading-none">
          {mode === "change" ? "Change your username" : "Pick a username"}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#a1a1aa]">
          This is what shows on the Tail or Fade board and your streak callouts. Your email never does.
        </p>

        <label htmlFor="tof-username" className="mt-5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          Username
        </label>
        <div className="mt-2 flex h-12 items-center gap-2 rounded-lg border border-[rgba(25,245,124,0.5)] bg-white/[0.03] px-3.5">
          <span className="text-[15px] font-bold text-[#52525b]">@</span>
          <input
            id="tof-username"
            ref={inputRef}
            type="text"
            autoComplete="off"
            maxLength={20}
            value={value}
            placeholder={currentName ?? "your_name"}
            onChange={(e) => setTyped(e.target.value.trim())}
            className="min-w-0 flex-grow bg-transparent text-[15px] font-bold text-[var(--color-text)] outline-none placeholder:text-[#52525b]"
          />
          <span aria-live="polite" className="shrink-0">
            {displayAvailability === "available" && (
              <span className="text-[11px] font-extrabold text-[var(--color-pos)]">AVAILABLE</span>
            )}
            {displayAvailability === "taken" && (
              <span className="text-[11px] font-extrabold text-[var(--color-neg)]">TAKEN</span>
            )}
            {displayAvailability === "checking" && (
              <span className="text-[11px] font-extrabold text-[var(--color-text-muted)]">CHECKING</span>
            )}
          </span>
        </div>
        <div className="mt-2 min-h-[16px] text-[11px] text-[var(--color-text-muted)]">
          {localError ?? serverError ?? "3 to 20 characters. Letters, numbers, underscores. One change every 30 days."}
        </div>
        {mode === "claim" && (
          <div className="mt-3">
            <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Tracked capper?</div>
            <VerifyWithX returnTo={typeof window === "undefined" ? "/" : window.location.pathname} label="Verify with X and use my handle" />
          </div>
        )}
        {nextChange && (
          <div className="mt-2 text-[12px] font-semibold text-[var(--color-gold)]">
            Next change allowed {nextChange.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.
          </div>
        )}

        <div className="mt-5 flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-white/[0.02] px-3.5 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border-h)] bg-[#2a2a33] text-[11px] font-extrabold text-[var(--color-text-soft)]">
            {(value || currentName || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-grow">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">How you look on the board</div>
            <div className="truncate text-[13px] font-extrabold">{value || currentName || "your_name"}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void claim()}
          disabled={!canClaim}
          className="mt-5 h-[46px] w-full rounded-lg bg-[var(--color-pos)] text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#0a0a0c] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Saving" : mode === "change" ? "Save username" : "Claim and deal me in"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 h-10 w-full rounded-lg border border-[var(--color-border)] text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-soft)]"
        >
          {mode === "change" ? "Cancel" : "Not now"}
        </button>
      </div>
    </div>
  );
}
