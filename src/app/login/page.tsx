"use client";
import { Suspense, useState, useMemo } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { vipEnabled } from "@/lib/flags";
import { signInReturnPath } from "@/app/auth/callback/redirects";
import { SELLER_NO_PASSWORD, signInErrorMessage } from "@/lib/password-auth";

/**
 * Sign-in: magic link + emailed code, same email.
 *
 * The code entry exists because the magic link is PKCE: its verifier lives
 * in the browser that requested it, so opening the emailed link in a
 * different browser or an in-app webview fails with flow_state_not_found
 * (Inferno, 2026-08-16/17, "tried both; no go"). Supabase's magic-link email
 * carries a {{ .Token }} OTP as well (8 digits on this project); typing it here uses
 * the email OTP verifier path, which has no browser affinity. Errors from
 * /auth/callback arrive on ?error= and render here instead of a silent
 * bounce to the homepage.
 *
 * Password sign-in sits behind a text link as the fallback for mailboxes
 * that hold or junk the email (Comcast, 2026-11-06). It needs no email at
 * all; a password is set on the account page after one email sign-in.
 */
function LoginInner() {
  const enabled =
    vipEnabled() &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Google renders only once the provider is configured in Supabase
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const params = useSearchParams();
  const callbackError = params.get("error");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => (enabled ? createBrowserSupabase() : null), [enabled]);

  if (!enabled) notFound();

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) return;
    // Explicit emailRedirectTo is required. The Supabase project is shared
    // with FADE AI and its Site URL points at fadeai.bet, so a plain OTP
    // request emails a link that lands on FADE AI, not here (David hit this
    // 2026-09-22). tailslips.com/** is on the project's redirect allow-list.
    // The emailed code path below stays as the browser-affinity escape hatch.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) return;
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      setError("Enter the code from the email.");
      return;
    }
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setVerifying(false);
    if (error) {
      setError(error.message);
      return;
    }
    // The magic link returns through /auth/callback, which reads the saved
    // path; the code path has to read it here or every sign-in lands on My Tails.
    const dest = signInReturnPath(document.cookie);
    document.cookie = "ts_return_to=; path=/; max-age=0";
    window.location.href = dest;
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase || signingIn) return;
    setSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setError(signInErrorMessage(error));
        return;
      }
      // An account that owns a capper profile sells picks, so a password is
      // never enough for it: end the session and send them to the emailed
      // link. The platform refuses seller actions from a password session
      // anyway; this just keeps a seller from landing in one. A failed
      // lookup ends the session too rather than guessing.
      const userId = data.user?.id;
      const owned = userId
        ? await supabase.from("cappers").select("id").eq("claimed_by_user_id", userId).limit(1)
        : { data: null, error: new Error("no user on the session") };
      if (owned.error || (owned.data && owned.data.length > 0)) {
        if (owned.error) console.error("seller check after password sign-in failed:", owned.error);
        await supabase.auth.signOut();
        setPassword("");
        setError(owned.error ? "Could not finish signing in. Use the email sign-in." : SELLER_NO_PASSWORD);
        return;
      }
    } catch (err) {
      console.error("password sign-in failed:", err);
      setError(signInErrorMessage({}));
      return;
    } finally {
      setSigningIn(false);
    }
    const dest = signInReturnPath(document.cookie);
    document.cookie = "ts_return_to=; path=/; max-age=0";
    window.location.href = dest;
  }

  function switchMode(next: boolean) {
    setUsePassword(next);
    setPassword("");
    setError(null);
  }

  async function google() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <div className="rounded-2xl bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d] border border-[var(--color-border)] px-6 py-8">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Sign in to TailSlips</h1>
        <p className="mt-1 text-sm text-[var(--color-text-soft)]">
          Tail cappers and track your stable.
        </p>
        {callbackError && !sent && (
          <p className="mt-4 rounded-lg border border-[var(--color-neg)]/40 bg-[var(--color-neg)]/10 px-3 py-2 text-sm text-[var(--color-neg)]">
            {callbackError}
          </p>
        )}
        {sent ? (
          <form onSubmit={verifyCode} className="mt-6 space-y-3">
            <p className="text-sm text-[var(--color-pos)]">
              Check your email. Tap the sign-in link, or enter the code from the email
              below.
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Not in your inbox? Check your spam or junk folder for an email from
              noreply@tailslips.com, and mark it as not spam so the next one lands in your inbox.
            </p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code from the email"
              className="w-full rounded-lg bg-black/40 border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] tracking-[0.3em] text-center"
            />
            <button
              type="submit"
              disabled={verifying}
              className="w-full rounded-lg bg-[var(--color-text)] text-black font-semibold py-2 text-sm disabled:opacity-60"
            >
              {verifying ? "Verifying…" : "Sign in with code"}
            </button>
            {error && <p className="text-sm text-[var(--color-neg)]">{error}</p>}
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setCode("");
                setError(null);
              }}
              className="w-full text-xs text-[var(--color-text-muted)] underline"
            >
              Use a different email
            </button>
          </form>
        ) : usePassword ? (
          <form onSubmit={signInWithPassword} className="mt-6 space-y-3">
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg bg-black/40 border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            <input
              type="password"
              required
              autoComplete="current-password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg bg-black/40 border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            <button
              type="submit"
              disabled={signingIn}
              className="w-full rounded-lg bg-[var(--color-text)] text-black font-semibold py-2 text-sm disabled:opacity-60"
            >
              {signingIn ? "Signing in…" : "Sign in"}
            </button>
            {error && <p className="text-sm text-[var(--color-neg)]">{error}</p>}
            <p className="text-xs text-[var(--color-text-muted)]">
              No password yet? Sign in by email once, then set one on your account page.
            </p>
            <button
              type="button"
              onClick={() => switchMode(false)}
              className="w-full text-xs text-[var(--color-text-muted)] underline"
            >
              Email me a sign-in link instead
            </button>
          </form>
        ) : (
          <form onSubmit={sendLink} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg bg-black/40 border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--color-text)] text-black font-semibold py-2 text-sm"
            >
              Email me a sign-in link
            </button>
            {error && <p className="text-sm text-[var(--color-neg)]">{error}</p>}
            <button
              type="button"
              onClick={() => switchMode(true)}
              className="w-full text-xs text-[var(--color-text-muted)] underline"
            >
              Use a password instead
            </button>
          </form>
        )}
        {googleEnabled && (
          <button
            onClick={google}
            className="mt-3 w-full rounded-lg border border-[var(--color-border-h)] py-2 text-sm text-[var(--color-text)]"
          >
            Continue with Google
          </button>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
