"use client";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createBrowserSupabase } from "@/lib/supabase/client";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  SELLER_NO_PASSWORD,
  breachCount,
  ownsCapper,
  setPasswordErrorMessage,
  validateNewPassword,
} from "@/lib/password-auth";

/* Set or change the account password. Optional: the emailed link keeps
 * working. Being signed in already proves the mailbox, so no current
 * password is asked for (most accounts never had one).
 *
 * A password is checked against known breaches before it is saved, and an
 * account that owns a capper profile cannot set one at all: sellers stay on
 * the emailed link, and the platform refuses seller actions from a password
 * session regardless (api/user_auth.py get_seller_user_id). */
export function PasswordCard() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  // null until the ownership lookup answers; the form stays hidden meanwhile
  // and if the lookup fails, so a seller never sees it by accident.
  const [seller, setSeller] = useState<{ userId: string; owns: boolean } | null>(null);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? createBrowserSupabase()
        : null,
    []
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || saving) return;
    setSaved(false);
    const invalid = validateNewPassword(password);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      let breaches: number;
      try {
        breaches = await breachCount(password);
      } catch (err) {
        console.error("password breach lookup failed:", err);
        setError("Could not check that password right now. Try again in a minute.");
        return;
      }
      if (breaches > 0) {
        setError("That password has appeared in a data breach, so it is easy to guess. Pick a different one.");
        return;
      }
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        console.error("password update failed:", err);
        setError(setPasswordErrorMessage(err));
        return;
      }
      setPassword("");
      setShow(false);
      setSaved(true);
    } catch (err) {
      console.error("password update failed:", err);
      setError(setPasswordErrorMessage({}));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;
    ownsCapper(supabase, userId)
      .then((owns) => {
        if (!cancelled) setSeller({ userId, owns });
      })
      .catch((err) => {
        console.error("capper ownership lookup failed:", err);
        if (!cancelled) setLookupFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  if (!supabase) return null;

  const resolved = seller && seller.userId === userId ? seller : null;
  if (!resolved) {
    return lookupFailed ? (
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
        Could not load password settings. Refresh the page to try again.
      </p>
    ) : null;
  }
  if (resolved.owns) {
    return <p className="mt-3 text-xs text-[var(--color-text-muted)]">{SELLER_NO_PASSWORD}</p>;
  }

  return (
    <form onSubmit={save} className="mt-3">
      <p className="text-xs text-[var(--color-text-muted)]">
        Optional. Set one to sign in without waiting on an email. The emailed link keeps working
        either way. At least {MIN_PASSWORD_LENGTH} characters.
      </p>
      <div className="mt-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            type={show ? "text" : "password"}
            autoComplete="new-password"
            aria-label="New password"
            maxLength={MAX_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setSaved(false);
            }}
            placeholder="New password"
            className="w-full rounded-lg bg-black/40 border border-[var(--color-border)] px-3 py-2 pr-14 text-sm text-[var(--color-text)]"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        <button
          type="submit"
          disabled={saving || password.length === 0}
          className="shrink-0 rounded-lg bg-[var(--color-text)] text-black font-semibold px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-[var(--color-neg)]">{error}</p>}
      {saved && (
        <p className="mt-2 text-sm text-[var(--color-pos)]">
          Password saved. Use it on the sign-in page any time.
        </p>
      )}
    </form>
  );
}
