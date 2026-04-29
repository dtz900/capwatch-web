interface Props {
  followerCount?: number | null;
  trackedSince?: string | null;
  tagline?: string;
}

export function MetaLine({ followerCount, trackedSince, tagline }: Props) {
  const parts: string[] = [];
  if (followerCount != null) parts.push(`${formatFollowers(followerCount)} followers`);
  if (tagline) parts.push(tagline);
  if (trackedSince) parts.push(`Tracked since ${formatMonth(trackedSince)}`);

  return (
    <div className="text-[11px] text-[var(--color-text-muted)] font-medium leading-relaxed
                    flex flex-wrap gap-x-2.5 gap-y-1.5">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <span className="opacity-40 ml-2.5">·</span>}
        </span>
      ))}
    </div>
  );
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}
function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
