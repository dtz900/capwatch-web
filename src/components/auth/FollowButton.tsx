"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export function FollowButton({ capperId }: { capperId: number }) {
  const { entitlements, session } = useAuth();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) {
      setFollowing(null);
      return;
    }
    supabase
      .from("capper_follows")
      .select("capper_id")
      .eq("user_id", session.user.id)
      .eq("capper_id", capperId)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [session, capperId, supabase]);

  async function toggle() {
    if (pending) return;
    if (!entitlements.isLoggedIn || !session) {
      router.push("/login");
      return;
    }
    setPending(true);
    try {
      if (following) {
        setFollowing(false);
        const { error } = await supabase
          .from("capper_follows")
          .delete()
          .eq("user_id", session.user.id)
          .eq("capper_id", capperId);
        if (error) setFollowing(true);
      } else {
        setFollowing(true);
        const { error } = await supabase
          .from("capper_follows")
          .insert({ user_id: session.user.id, capper_id: capperId });
        if (error) setFollowing(false);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending || following === null}
      className={
        following
          ? "rounded-lg bg-[var(--color-text)] text-black px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          : "rounded-lg border border-[var(--color-border-h)] px-3 py-1.5 text-sm text-[var(--color-text)] disabled:opacity-50"
      }
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
