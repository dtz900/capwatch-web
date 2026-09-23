"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { VerifyWithX } from "@/components/auth/VerifyWithX";
import { xAuthEnabled } from "@/lib/flags";

/* Account page state for X verification. Copy speaks to the capper; the
   mechanics (id match, claim function) stay out of it. */
export function XVerificationCard() {
  const { capper, claimStatus } = useAuth();
  if (!xAuthEnabled()) return null;

  if (capper) {
    return (
      <div className="mt-3">
        <div className="text-[15px] font-bold text-[var(--color-text)]">
          Verified as <Link href={`/cappers/${capper.handle}`} className="text-[#2fd9c0] hover:underline">@{capper.handle}</Link>
        </div>
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">Your handle is your name on the Tail or Fade board and your X photo shows next to it.</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {claimStatus === "claimed_by_other" && (
        <p className="mb-2 text-[12px] text-[var(--color-neg)]">That X account is already linked to another TailSlips account.</p>
      )}
      {claimStatus === "no_capper" && (
        <p className="mb-2 text-[12px] text-[var(--color-text-soft)]">X linked. That account is not on the tracked capper list, so your name is your own pick.</p>
      )}
      <p className="text-[12px] text-[var(--color-text-soft)]">
        Tracked cappers get their handle as their name and their X photo on the board.
      </p>
      {claimStatus !== "no_capper" && <VerifyWithX returnTo="/account" className="mt-2 max-w-xs" />}
    </div>
  );
}
