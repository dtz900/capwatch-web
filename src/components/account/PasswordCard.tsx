"use client";
import { useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { MAX_PASSWORD_LENGTH, setPasswordErrorMessage, validateNewPassword } from "@/lib/password-auth";

/* Set or change the account password. Optional: the emailed link keeps
 * working. Being signed in already proves the mailbox, so no current
 * password is asked for (most accounts never had one). */
export function PasswordCard() {
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

  if (!supabase) return null;

  return (
    <form onSubmit={save} className="mt-3">
      <p className="text-xs text-[var(--color-text-muted)]">
        Optional. Set one to sign in without waiting on an email. The emailed link keeps working
        either way.
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
