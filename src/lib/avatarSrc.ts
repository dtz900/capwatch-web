/* Capper avatars live on pbs.twimg.com. Some browsers block that host
   outright (privacy extensions, DNS blockers), so a plain <img> pointing at
   it renders broken while next/image avatars, which load from our own
   /_next/image proxy, keep working. Plain <img> avatars route through the
   same proxy with this. Other hosts (the Supabase bucket) pass through.
   128 is in next/image's default imageSizes, enough for a 64px circle at 2x. */
const TWIMG_AVATAR = /^https:\/\/pbs\.twimg\.com\/profile_images\//;

export function avatarSrc(url: string | null | undefined, width = 128): string | null {
  if (!url) return null;
  return TWIMG_AVATAR.test(url) ? `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75` : url;
}
