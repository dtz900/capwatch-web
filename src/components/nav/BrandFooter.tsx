import Image from "next/image";
import Link from "next/link";

export function BrandFooter() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.04)] mt-4 pb-20 sm:pb-0">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-7 py-10 flex flex-col items-center justify-center gap-6">
        <div className="max-w-[640px] text-center text-[12px] leading-[1.55] text-[var(--color-text-muted)] space-y-2 px-2">
          <p>
            TailSlips tracks publicly posted picks from public Twitter accounts. We are not a sportsbook
            and not affiliated with any gambling operator. Information shown is not betting advice.
          </p>
          <p>
            Records reflect only public posts parsed by our pipeline. Some picks may be missing or
            misattributed. See{" "}
            <Link href="/methodology" className="underline hover:text-[var(--color-text)]">
              methodology
            </Link>{" "}
            for what we do and do not capture.
          </p>
          <p>
            21+. If you or someone you know has a gambling problem, call{" "}
            <a href="tel:1-800-426-2537" className="underline hover:text-[var(--color-text)]">
              1-800-GAMBLER
            </a>
            .
          </p>
        </div>
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
