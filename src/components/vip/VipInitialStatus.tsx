"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { VipCapperStatus } from "@/lib/vip/types";

/* The anonymous VIP status the profile page fetched on the server, so the
 * hero ring, crown and VIP card paint with the page instead of after the
 * browser's own status call. Anonymous only: never viewer-specific. */
const VipInitialStatusContext = createContext<VipCapperStatus | null>(null);

export function VipInitialStatusProvider({
  status,
  children,
}: {
  status: VipCapperStatus | null;
  children: ReactNode;
}) {
  return <VipInitialStatusContext.Provider value={status}>{children}</VipInitialStatusContext.Provider>;
}

export function useVipInitialStatus(): VipCapperStatus | null {
  return useContext(VipInitialStatusContext);
}
