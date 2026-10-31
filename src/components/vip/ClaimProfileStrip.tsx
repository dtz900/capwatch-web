"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { VerifyWithX } from "@/components/auth/VerifyWithX";
import { xAuthEnabled } from "@/lib/flags";
import { SECONDARY_BTN } from "./styles";

const RETURN_COOKIE = "ts_return_to";

/** The start of selling: an unclaimed capper's own profile asks "Are you
 *  @handle?". Signed out, Sign in comes back here; signed in, Verify with X
 *  runs the claim and lands back here as the owner. Hidden for a viewer who
 *  already owns another capper. */
export function ClaimProfileStrip({ handle }: { handle: string }) {
  const { session, authReady, capper } = useAuth();
  const path = `/cappers/${encodeURIComponent(handle)}`;
  if (session && capper) return null;
  const remember = () => {
    document.cookie = `${RETURN_COOKIE}=${encodeURIComponent(path)}; path=/; max-age=1800; samesite=lax`;
  };
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[14px] font-bold text-[var(--color-text)]">Are you @{handle}?</p>
        <p className="text-[12px] text-[var(--color-text-soft)]">Claim your profile and begin selling.</p>
      </div>
      {!session ? (
        <Link
          href={`/login?next=${encodeURIComponent(path)}`}
          onClick={remember}
          aria-disabled={!authReady}
          className={`${SECONDARY_BTN} whitespace-nowrap`}
        >
          Sign in to claim
        </Link>
      ) : xAuthEnabled() ? (
        <VerifyWithX returnTo={path} label="Verify with X to claim" className="w-full sm:w-auto sm:min-w-[200px]" />
      ) : (
        <span className="text-[11px] text-[var(--color-text-muted)]">Verification opens soon.</span>
      )}
    </div>
  );
}
