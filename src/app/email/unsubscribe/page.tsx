import Link from "next/link";

import { applyUnsub } from "./apply";
import { unsubKind } from "./kinds";

export const dynamic = "force-dynamic";

/* Signed unsubscribe link from an email footer. Verification and the write
 * live in ./apply, shared with the one-click POST route that mailbox
 * providers call (src/app/api/email/unsubscribe/route.ts). */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string; k?: string }>;
}) {
  const { u = "", t = "", k } = await searchParams;
  const kind = unsubKind(k);
  const ok = (await applyUnsub(u, t, k)) === "ok";

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="w-full rounded-2xl bg-gradient-to-b from-[#15151a] via-[#0f0f14] to-[#0a0a0d] border border-[var(--color-border)] px-6 py-8">
        <h1 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
          {kind.heading}
        </h1>
        {ok ? (
          <>
            <p className="mt-3 text-[15px] font-bold text-[var(--color-text)]">
              {kind.done}
            </p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              You can turn them back on anytime from your{" "}
              <Link href="/account" className="underline">
                account page
              </Link>
              .
            </p>
          </>
        ) : (
          <p className="mt-3 text-[15px] font-bold text-[var(--color-text)]">
            That unsubscribe link is invalid or expired.
          </p>
        )}
      </div>
    </main>
  );
}
