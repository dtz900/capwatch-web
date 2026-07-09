"use client";
import { useState, useMemo } from "react";
import { notFound } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { vipEnabled } from "@/lib/flags";

export default function LoginPage() {
  const enabled =
    vipEnabled() &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Google renders only once the provider is configured in Supabase
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => (enabled ? createBrowserSupabase() : null), [enabled]);

  if (!enabled) notFound();

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
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
          Tail cappers and unlock premium stats.
        </p>
        {sent ? (
          <p className="mt-6 text-sm text-[var(--color-pos)]">
            Check your email for the sign-in link.
          </p>
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
