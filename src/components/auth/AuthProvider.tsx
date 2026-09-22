"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { resolveEntitlements, type Entitlements } from "@/lib/entitlements";
import { vipEnabled } from "@/lib/flags";

export interface TsProfile {
  tier: string;
  username: string | null;
  username_changed_at: string | null;
}

interface AuthState {
  session: Session | null;
  profile: TsProfile | null;
  entitlements: Entitlements;
  signOut: () => Promise<void>;
  /** Re-read ts_profiles (after a username claim). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  entitlements: { isLoggedIn: false, isVip: false },
  signOut: async () => {},
  refreshProfile: async () => {},
});

const PROFILE_COLUMNS = "tier, username, username_changed_at";

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
    const { data } = await supabase
      .from("ts_profiles")
      .select(PROFILE_COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setProfile(data as TsProfile);
      return;
    }
    // No row = first TailSlips login. The app owns roster membership
    // (the shared-project signup trigger was dropped 2026-07-13, since
    // it swept FADE AI signups into the TailSlips roster); self-insert
    // is allowed by RLS, tier pinned to 'free'. Missing row still
    // resolves to free if this races or fails.
    setProfile({ tier: "free", username: null, username_changed_at: null });
    const { error } = await supabase
      .from("ts_profiles")
      .upsert({ user_id: user.id, email: user.email ?? null }, { onConflict: "user_id", ignoreDuplicates: true });
    if (error) console.error("ts_profiles self-insert failed:", error);
  }, [supabase, session]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const value: AuthState = {
    session,
    profile,
    entitlements: resolveEntitlements(session, profile),
    signOut: async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
    },
    refreshProfile: loadProfile,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
