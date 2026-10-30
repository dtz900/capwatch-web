import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { email_vip_picks: true }, error: null }) }) }),
    }),
  }),
}));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ session: { user: { id: "u1" } } }) }));

import { VipEmailToggle } from "./VipEmailToggle";

describe("VipEmailToggle", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("toggle renders only with flag", async () => {
    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "false");
    const { container, unmount } = render(<VipEmailToggle />);
    expect(container).toBeEmptyDOMElement();
    unmount();

    vi.stubEnv("NEXT_PUBLIC_CAPPER_VIP_ENABLED", "true");
    render(<VipEmailToggle />);
    expect(await screen.findByRole("button", { name: "Toggle VIP pick emails" })).toBeInTheDocument();
    expect(screen.getByText("VIP pick emails")).toBeInTheDocument();
    expect(screen.getByText("One email per VIP pick from cappers you subscribe to.")).toBeInTheDocument();
  });
});
