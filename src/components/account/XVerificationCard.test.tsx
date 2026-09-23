import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.value }));

import { XVerificationCard } from "./XVerificationCard";

const base = { session: { user: { id: "u1" } }, linkX: vi.fn(async () => null) };

describe("XVerificationCard", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_VIP_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_X_AUTH_ENABLED", "true");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("renders nothing when the flag is off", () => {
    vi.stubEnv("NEXT_PUBLIC_X_AUTH_ENABLED", "false");
    auth.value = { ...base, capper: null, claimStatus: "idle" };
    const { container } = render(<XVerificationCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the verified handle linked to the capper page", () => {
    auth.value = { ...base, capper: { id: 7, handle: "fadeai_", avatar_url: null }, claimStatus: "verified" };
    render(<XVerificationCard />);
    expect(screen.getByRole("link", { name: "@fadeai_" })).toHaveAttribute("href", "/cappers/fadeai_");
    expect(screen.queryByRole("button", { name: /verify with x/i })).toBeNull();
  });

  it("offers the button when not verified", () => {
    auth.value = { ...base, capper: null, claimStatus: "idle" };
    render(<XVerificationCard />);
    expect(screen.getByRole("button", { name: /verify with x/i })).toBeInTheDocument();
  });

  it("explains a stale claim held by another account", () => {
    auth.value = { ...base, capper: null, claimStatus: "claimed_by_other" };
    render(<XVerificationCard />);
    expect(screen.getByText(/already linked to another TailSlips account/)).toBeInTheDocument();
  });

  it("tells a linked non-capper their name is their own pick, without the button", () => {
    auth.value = { ...base, capper: null, claimStatus: "no_capper" };
    render(<XVerificationCard />);
    expect(screen.getByText(/not on the tracked capper list/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /verify with x/i })).toBeNull();
  });
});
