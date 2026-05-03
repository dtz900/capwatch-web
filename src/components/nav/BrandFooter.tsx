import Image from "next/image";

/**
 * Site-wide brand footer. Renders the stacked TailSlips logo as the final
 * mark on every page, below whatever per-page footer content exists.
 *
 * Sized at 176px height for a strong end-of-page brand stamp. Image
 * must exist at /public/logo-stacked.png (transparent).
 */
export function BrandFooter() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.04)] mt-4 pb-20 sm:pb-0">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-7 py-10 flex flex-col items-center justify-center gap-3">
        <Image
          src="/logo-stacked.png"
          alt="TailSlips"
          width={320}
          height={320}
          priority={false}
          className="h-44 w-auto"
        />
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] font-bold">
          Operated by FADE AI
        </div>
      </div>
    </footer>
  );
}
