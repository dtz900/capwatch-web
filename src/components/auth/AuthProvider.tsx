"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { resolveEntitlements, type Entitlements } from "@/lib/entitlements";
import { vipEnabled } from "@/lib/flags";
import { hasTwitterIdentity, parseClaimResult, type ClaimResult, type ClaimStatus } from "@/lib/x-claim";

export interface TsProfile {
  tier: string;
  username: string | null;
  username_changed_at: string | null;
  avatar_url: string | null;
}

export interface VerifiedCapper {
  id: number;
  handle: string;
  avatar_url: string | null;
}

interface AuthState {
  session: Session | null;
  profile: TsProfile | null;
  entitlements: Entitlements;
  /** The capper this account owns, once tof_claim_x_identity() says verified. */
  capper: VerifiedCapper | null;
  claimStatus: ClaimStatus;
  /** X handle offered as a username to a non-capper who linked X. */
  suggestedUsername: string | null;
  signOut: () => Promise<void>;
  /** Re-read ts_profiles (after a username claim or an avatar change). */
  refreshProfile: () => Promise<void>;
  /** Start the X identity link. Returns null when the redirect started, else the error. */
  linkX: (returnTo: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  entitlements: { isLoggedIn: false, isVip: false },
  capper: null,
  claimStatus: "idle",
  suggestedUsername: null,
  signOut: async () => {},
  refreshProfile: async () => {},
  linkX: async () => "Sign-in is not available.",
});

const PROFILE_COLUMNS = "tier, username, username_changed_at, avatar_url";
// Identity-link return path. Separate from ts_return_to (sign-in) so the
// callback can tell a failed link from a failed magic link.
const LINK_RETURN_COOKIE = "ts_link_return";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<TsProfile | null>(null);
  const enabled =
    vipEnabled() &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = useMemo(() => (enabled ? createBrowserSupabase() : null), [enabled]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const loadProfile = useCallback(async () => {
    if (!supabase) return;
    const user = session?.user;
    if (!user?.id) {
      setProfile(null);
      return;
    }
    let { data, error: readError } = await supabase
      .from("ts_profiles")
      .select(PROFILE_COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError?.code === "42703") {
      // Staged deploy: this build expects the username columns but the DB
      // has not got them yet. The tier must still resolve or every paid
      // user reads as free until the migration lands, so fall back to the
      // columns that have always existed.
      console.warn("ts_profiles: username columns missing, reading tier only");
      const fallback = await supabase.from("ts_profiles").select("tier").eq("user_id", user.id).maybeSingle();
      data = fallback.data as typeof data;
      readError = fallback.error;
    }
    if (readError) {
      // A failed read is not "no row". Treating it as one would downgrade a
      // paid user to free and fire a spurious self-insert on any transient
      // failure or a column this deploy expects but the DB has not got yet
      // (42703). Leave the profile as it stands and say so in the console.
      console.error("ts_profiles load failed:", readError);
      return;
    }
    if (data) {
      setProfile(data as TsProfile);
      return;
    }
    // No row = first TailSlips login. The app owns roster membership
    // (the shared-project signup trigger was dropped 2026-07-13, since
    // it swept FADE AI signups into the TailSlips roster); self-insert
    // is allowed by RLS, tier pinned to 'free'. Missing row still
    // resolves to free if this races or fails.
    setProfile({ tier: "free", username: null, username_changed_at: null, avatar_url: null });
    const { error } = await supabase
      .from("ts_profiles")
      .upsert({ user_id: user.id, email: user.email ?? null }, { onConflict: "user_id", ignoreDuplicates: true });
    if (error) console.error("ts_profiles self-insert failed:", error);
  }, [supabase, session]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  // Verification. Keyed by user id and derived, never reset in an effect, so
  // a sign-out or a user swap cannot leak the previous account's answer.
  const userId = session?.user?.id ?? null;
  const twitterLinked = hasTwitterIdentity(session?.user);
  const [claim, setClaim] = useState<{ userId: string; result: ClaimResult } | null>(null);
  const claimResult = claim && claim.userId === userId ? claim.result : null;

  useEffect(() => {
    if (!supabase || !userId || !twitterLinked) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("tof_claim_x_identity");
      if (cancelled) return;
      if (error) {
        // Verification is retried on the next sign-in; the account works as
        // an ordinary email account until then.
        console.error("tof_claim_x_identity failed:", error);
        return;
      }
      const result = parseClaimResult(data);
      if (!result) {
        console.error("tof_claim_x_identity: unexpected payload", data);
        return;
      }
      setClaim({ userId, result });
      // The function may have set the username or a default avatar.
      if (result.status === "verified" || result.status === "no_capper") await loadProfile();
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, twitterLinked, loadProfile]);

  const linkX = useCallback(
    async (returnTo: string) => {
      if (!supabase) return "Sign-in is not available.";
      const safe = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
      document.cookie = `${LINK_RETURN_COOKIE}=${encodeURIComponent(safe)}; path=/; max-age=1800; samesite=lax`;
      // "x" = the X / Twitter (OAuth 2.0) provider Supabase recommends (the
      // legacy "twitter" provider is OAuth 1.0a and slated for deprecation).
      const { error } = await supabase.auth.linkIdentity({
        provider: "x",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      return error ? error.message : null;
    },
    [supabase],
  );

  const value: AuthState = {
    session,
    profile,
    entitlements: resolveEntitlements(session, profile),
    capper:
      claimResult?.status === "verified"
        ? { id: claimResult.capper_id, handle: claimResult.handle, avatar_url: claimResult.avatar_url }
        : null,
    claimStatus: claimResult?.status ?? "idle",
    suggestedUsername: claimResult?.status === "no_capper" ? claimResult.suggested_username : null,
    signOut: async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
    },
    refreshProfile: loadProfile,
    linkX,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
