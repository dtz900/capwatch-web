"use client";
import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { AVATAR_BUCKET, avatarObjectPath, cropToSquareJpeg, validateAvatarFile } from "@/lib/avatar";
import { displayAvatar } from "@/lib/x-claim";
import { BoardAvatar } from "@/components/tof/BoardAvatar";

/* Photo for the Tail or Fade board. Writes tof-avatars/<uid>/avatar.jpg
   (storage policies lock the folder to its owner) and ts_profiles.avatar_url
   (column-scoped grant). A verified capper's board photo is their tracked X
   photo regardless; the upload still saves for the rest of the site. */
export function AvatarUpload() {
  const { session, profile, capper, refreshProfile } = useAuth();
  const userId = session?.user?.id ?? null;
  const supabase = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? createBrowserSupabase()
        : null,
    [],
  );
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!userId) return null;
  const uid = userId;
  const current = displayAvatar(profile, capper);
  const name = profile?.username ?? session?.user?.email ?? "?";

  async function upload(file: File) {
    if (!supabase) return;
    const reason = validateAvatarFile(file);
    if (reason) {
      setError(reason);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await cropToSquareJpeg(file);
      const path = avatarObjectPath(uid);
      const up = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
        upsert: true,
        contentType: "image/jpeg",
        cacheControl: "60",
      });
      if (up.error) throw new Error(up.error.message);
      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error: dbError } = await supabase.from("ts_profiles").update({ avatar_url: url }).eq("user_id", uid);
      if (dbError) throw new Error(dbError.message);
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that photo. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    try {
      const { error: rmError } = await supabase.storage.from(AVATAR_BUCKET).remove([avatarObjectPath(uid)]);
      if (rmError) throw new Error(rmError.message);
      const { error: dbError } = await supabase.from("ts_profiles").update({ avatar_url: null }).eq("user_id", uid);
      if (dbError) throw new Error(dbError.message);
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove that photo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex items-center gap-4">
      <BoardAvatar url={current} name={name} size={56} />
      <div className="min-w-0 flex-grow">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="rounded-lg border border-[var(--color-border-h)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] disabled:opacity-60"
          >
            {busy ? "Saving" : current ? "Change photo" : "Add a photo"}
          </button>
          {profile?.avatar_url && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-soft)] disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">
          {capper ? "The board shows your X photo. This one shows everywhere else." : "Shows next to your name on the Tail or Fade board. JPG, PNG or WebP."}
        </p>
        {error && <p className="mt-1 text-[11px] text-[var(--color-neg)]">{error}</p>}
      </div>
    </div>
  );
}
