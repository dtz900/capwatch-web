import Image from "next/image";

/**
 * Site-wide brand footer. Renders the stacked TailSlips logo as the final
 * mark on every page, below whatever per-page footer content exists.
 *
 * Sized at 80px height so the wordmark is legible without dominating the
 * page. Image must exist at /public/logo-stacked.jpg.
 */
export function BrandFooter() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.04)] mt-4">
      <div className="max-w-[1240px] mx-auto px-7 py-10 flex flex-col items-center justify-center gap-3">
        <Image
          src="/logo-stacked.jpg"
          alt="TailSlips"
          width={240}
          height={240}
          priority={false}
          className="h-28 w-auto"
          style={{ mixBlendMode: "screen" }}
        />
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
          Operated by FADE AI
        </div>
      </div>
    </footer>
  );
}
