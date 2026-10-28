import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("./actions", () => ({
  grantVipSubscriptionAction: vi.fn().mockResolvedValue({
    ok: true,
    row: { capper_id: 1, user_id: "u", status: "active", current_period_end: "2026-11-26T00:00:00Z" },
  }),
  revokeVipSubscriptionAction: vi.fn().mockResolvedValue({ ok: false, error: "No subscription to revoke" }),
}));

import { VipGrantForm } from "./VipGrantForm";

describe("VipGrantForm", () => {
  it("grant shows result line", async () => {
    render(<VipGrantForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/capper/i), { target: { value: "@swampy" } });
    fireEvent.click(screen.getByRole("button", { name: "Grant" }));
    await waitFor(() =>
      expect(screen.getByText("Granted: @swampy for a@b.com until 2026-11-26")).toBeTruthy(),
    );
  });

  it("revoke shows error", async () => {
    render(<VipGrantForm />);
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(screen.getByText("No subscription to revoke")).toBeTruthy());
  });
});
