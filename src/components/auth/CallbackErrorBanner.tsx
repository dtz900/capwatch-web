"use client";
import { useSearchParams } from "next/navigation";

/* A failed identity link (auth/callback) returns to the page the user left
   with ?error=. Mount inside <Suspense> on pages that are not /login or
   /account, which read the param themselves. */
export function CallbackErrorBanner({ className = "" }: { className?: string }) {
  const params = useSearchParams();
  const message = params.get("error");
  if (!message) return null;
  return (
    <p role="alert" className={`rounded-lg border border-[var(--color-neg)]/40 bg-[var(--color-neg)]/10 px-3 py-2 text-[12px] text-[var(--color-neg)] ${className}`}>
      {message}
    </p>
  );
}
