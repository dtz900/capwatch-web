"use client";
import { Suspense, useState, useMemo } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { vipEnabled } from "@/lib/flags";

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
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => (enabled ? createBrowserSupabase() : null), [enabled]);

  if (!enabled) notFound();

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) return;
    // No emailRedirectTo on purpose. Verified 2026-08-17 against prod: the
    // redirect-bearing request rendered the link-only email even with
    // {{ .Token }} in the template; the plain OTP request rendered link +
    // code. The link still resolves through the project Site URL to
    // /auth/callback, and the code path is what removes the browser-affinity
    // failure entirely.
    const { error } = await supabase.auth.signInWithOtp({ email });
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
    window.location.href = "/my-tails";
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
