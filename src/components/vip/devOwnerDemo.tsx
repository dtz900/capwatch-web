"use client";

/* LOCAL DESIGN DEMO ONLY. Do not commit. With NEXT_PUBLIC_VIP_FIXTURES=true,
 * ?vipdemo=owner on any capper profile renders the VIP section as that
 * capper's signed-in owner (selling, NBA eligible) with the new pick builder
 * mock. Nothing is fetched or written. */

import { useEffect, useState, type ReactNode } from "react";
import { PickBuilderMock } from "@/app/dev/vip-fixtures/PickBuilderMock";
import { SellerStripMock } from "@/app/dev/vip-fixtures/SellerStripMock";
import type { VipCapperStatus } from "@/lib/vip/types";
import { CapperVipView } from "./CapperVipSection";
import { EYEBROW, SECTION, VIP_PRIMARY_BTN } from "./styles";

const OWNER_STATUS: VipCapperStatus = {
  seller: { capper_id: 0, price_cents: 2500, founding: true, status: "active" },
  eligibility: [
    {
      sport: "NBA",
      eligible: true,
      eligible_since: "2026-10-24",
      units: 6.2,
      n_picks: 24,
      n_floor_picks: 22,
      run_date: "2026-10-28",
      reason: "ok",
      fail_streak: 0,
    },
  ],
  door_open: true,
  door_closed_reason: null,
  viewer: { subscribed: false, is_owner: true },
  vip_record: { n: 6, wins: 4, losses: 2, pushes: 0, units: 2.1 },
  locked: [],
};

function OwnerDemoPanel() {
  // The board stays closed until the capper asks for it, so their own
  // profile reads like everyone else's on a normal visit.
  const [open, setOpen] = useState(false);
  return (
    <section className={`${SECTION} flex flex-col gap-4`}>
      <span className={EYEBROW}>Your VIP dashboard</span>
      <SellerStripMock />
      {open ? (
        <>
          <button
            type="button"
            className="self-end text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            onClick={() => setOpen(false)}
          >
            Close pick builder
          </button>
          <PickBuilderMock />
        </>
      ) : (
        <button type="button" className={`${VIP_PRIMARY_BTN} self-start`} onClick={() => setOpen(true)}>
          Post a VIP pick
        </button>
      )}
    </section>
  );
}

/** The demo section when ?vipdemo=owner is on the URL, else null. Reads the
 *  URL after mount so server and client render the same first pass. */
export function useOwnerDemo(handle: string): ReactNode {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_VIP_FIXTURES !== "true") return;
    setOn(new URLSearchParams(window.location.search).get("vipdemo") === "owner");
  }, []);
  if (!on) return null;
  return <CapperVipView status={OWNER_STATUS} handle={handle} ownerPanel={<OwnerDemoPanel />} />;
}
