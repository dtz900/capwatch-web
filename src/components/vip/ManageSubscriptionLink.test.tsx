import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.value }));
const client = vi.hoisted(() => ({ openVipPortal: vi.fn() }));
vi.mock("@/lib/vip/client", () => client);

import { ManageSubscriptionLink } from "./ManageSubscriptionLink";

describe("ManageSubscriptionLink", () => {
  const assign = vi.fn();
  beforeEach(() => {
    auth.value = { authReady: true, session: { access_token: "tok", user: { id: "u1" } } };
    client.openVipPortal.mockReset();
    assign.mockReset();
    vi.stubGlobal("location", { ...window.location, assign });
  });

  it("opens the Stripe portal", async () => {
    client.openVipPortal.mockResolvedValue({ url: "https://billing.stripe.com/p" });
    render(<ManageSubscriptionLink capperId={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage subscription" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://billing.stripe.com/p"));
    expect(client.openVipPortal).toHaveBeenCalledWith(7, "tok");
  });

  it("shows plain copy when the portal fails", async () => {
    client.openVipPortal.mockRejectedValue(new Error("boom"));
    render(<ManageSubscriptionLink capperId={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage subscription" }));
    expect(await screen.findByText("Could not open billing. Try again.")).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});
