"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { vipEnabled } from "@/lib/flags";

interface FollowedCapper {
  capper_id: number;
  handle: string;
  display_name: string | null;
}

export default function MyCappersPage() {
  const { entitlements, session } = useAuth();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const [rows, setRows] = useState<FollowedCapper[] | null>(null);
  const enabled = vipEnabled();

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("capper_follows")
      .select("capper_id, cappers(handle, display_name)")
      .eq("user_id", session.user.id)
      .then(({ data }) =>
        setRows(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data ?? []).map((r: any) => ({
            capper_id: r.capper_id,
            handle: r.cappers?.handle ?? "",
            display_name: r.cappers?.display_name ?? null,
          }))
        )
      );
  }, [session, supabase]);

  if (!enabled) notFound();

  if (!entitlements.isLoggedIn) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-[var(--color-text-soft)]">
          <button onClick={() => router.push("/login")} className="underline">
            Sign in
          </button>{" "}
          to follow cappers and build your list.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">My Cappers</h1>
      <div className="mt-6 space-y-2">
        {rows === null && <p className="text-[var(--color-text-muted)]">Loading...</p>}
        {rows?.length === 0 && (
          <p className="text-[var(--color-text-soft)]">
            No follows yet. Hit Follow on any capper profile.
          </p>
        )}
        {rows?.map((c) => (
          <Link
            key={c.capper_id}
            href={`/cappers/${c.handle}`}
            className="block rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-text)] hover:border-[var(--color-border-h)]"
          >
            {c.display_name ?? c.handle}
            <span className="ml-2 text-sm text-[var(--color-text-muted)]">@{c.handle}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
