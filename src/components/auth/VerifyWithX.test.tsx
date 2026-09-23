import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.value }));

import { VerifyWithX } from "./VerifyWithX";

describe("VerifyWithX", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_X_AUTH_ENABLED", "true");
    auth.value = { session: { user: { id: "u1" } }, linkX: vi.fn(async () => null) };
  });
  afterEach(() => vi.unstubAllEnvs());

  it("renders nothing when the flag is off", () => {
    vi.stubEnv("NEXT_PUBLIC_X_AUTH_ENABLED", "false");
    const { container } = render(<VerifyWithX returnTo="/account" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when signed out", () => {
    auth.value = { session: null, linkX: vi.fn() };
    const { container } = render(<VerifyWithX returnTo="/account" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("starts the link with the return path", async () => {
    render(<VerifyWithX returnTo="/account" />);
    fireEvent.click(screen.getByRole("button", { name: /verify with x/i }));
    await waitFor(() => expect(auth.value.linkX).toHaveBeenCalledWith("/account"));
  });

  it("shows the link error inline and re-enables the button", async () => {
    auth.value = { session: { user: { id: "u1" } }, linkX: vi.fn(async () => "Manual linking is disabled") };
    render(<VerifyWithX returnTo="/account" />);
    fireEvent.click(screen.getByRole("button", { name: /verify with x/i }));
    await waitFor(() => expect(screen.getByText("Verification is not available right now.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /verify with x/i })).toBeEnabled();
  });
});
