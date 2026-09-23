/* Round board photo with the username initial as the fallback. Plain <img>:
   avatar hosts are pbs.twimg.com and the Supabase bucket, neither is on the
   next/image allow-list and a 20px circle gains nothing from optimization. */
export function BoardAvatar({ url, name, size = 20 }: { url: string | null; name: string; size?: number }) {
  const px = `${size}px`;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: px, height: px }} />;
  }
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full border border-[var(--color-border-h)] bg-[#2a2a33] font-[family-name:var(--font-display)] text-[var(--color-pos)]"
      style={{ width: px, height: px, fontSize: `${Math.round(size * 0.42)}px` }}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}
