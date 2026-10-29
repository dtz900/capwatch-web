import { afterEach, describe, expect, it, vi } from "vitest";
import {
  capperVipEnabled,
  capperVipEnabledFor,
  capperVipPreviewHandles,
  capperVipReachable,
} from "./flags";

function env(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v as string);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("capper VIP preview gate", () => {
  it("is fully dark with no launch flag and no preview list", () => {
    env({ NEXT_PUBLIC_VIP_ENABLED: "true", NEXT_PUBLIC_CAPPER_VIP_ENABLED: "", NEXT_PUBLIC_CAPPER_VIP_PREVIEW_HANDLES: "" });
    expect(capperVipEnabled()).toBe(false);
    expect(capperVipEnabledFor("moneyplayzz")).toBe(false);
    expect(capperVipReachable()).toBe(false);
  });

  it("turns on only for listed cappers, ignoring case and @", () => {
    env({
      NEXT_PUBLIC_VIP_ENABLED: "true",
      NEXT_PUBLIC_CAPPER_VIP_ENABLED: "",
      NEXT_PUBLIC_CAPPER_VIP_PREVIEW_HANDLES: " @ZZ_VipTest , other_test ",
    });
    expect(capperVipPreviewHandles()).toEqual(["zz_viptest", "other_test"]);
    expect(capperVipEnabledFor("zz_viptest")).toBe(true);
    expect(capperVipEnabledFor("ZZ_VIPTEST")).toBe(true);
    expect(capperVipEnabledFor("luckyluke_hits")).toBe(false);
    expect(capperVipEnabledFor(null)).toBe(false);
    expect(capperVipEnabled()).toBe(false);
    expect(capperVipReachable()).toBe(true);
  });

  it("needs accounts: no preview without the base VIP flag", () => {
    env({ NEXT_PUBLIC_VIP_ENABLED: "", NEXT_PUBLIC_CAPPER_VIP_PREVIEW_HANDLES: "zz_viptest" });
    expect(capperVipEnabledFor("zz_viptest")).toBe(false);
    expect(capperVipReachable()).toBe(false);
  });

  it("launch flag turns it on for everyone", () => {
    env({ NEXT_PUBLIC_VIP_ENABLED: "true", NEXT_PUBLIC_CAPPER_VIP_ENABLED: "true" });
    expect(capperVipEnabledFor("luckyluke_hits")).toBe(true);
    expect(capperVipReachable()).toBe(true);
  });
});
