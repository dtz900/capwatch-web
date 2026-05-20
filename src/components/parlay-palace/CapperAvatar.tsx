// Circular capper avatar with a thin gold ring; falls back to the first
// letter of the handle when the URL is missing. Used on PalaceCard and
// ParlayHero so the gallery and detail page both show whose parlay it is.
export function CapperAvatar({ url, handle, size = 28 }: {
  url: string | null | undefined;
  handle: string | null | undefined;
  size?: number;
}) {
  const initial = (handle ?? "?").slice(0, 1).toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 bg-[#1a1306] ring-1 ring-[rgba(202,164,90,0.45)]"
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-[10px] font-extrabold text-[#caa45a]">
          {initial}
        </span>
      )}
    </span>
  );
}
