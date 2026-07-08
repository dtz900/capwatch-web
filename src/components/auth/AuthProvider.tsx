"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { resolveEntitlements, type Entitlements } from "@/lib/entitlements";

interface AuthState {
  session: Session | null;
  profile: { tier: string } | null;
  entitlements: Entitlements;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  entitlements: { isLoggedIn: false, isVip: false },
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{ tier: string } | null>(null);
  const supabase = useMemo(() => createBrowserSupabase(), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }
    supabase
      .from("ts_profiles")
      .select("tier")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [session, supabase]);

  const value: AuthState = {
    session,
    profile,
    entitlements: resolveEntitlements(session, profile),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
