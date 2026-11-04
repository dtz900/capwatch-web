import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let auth: { session: unknown; authReady: boolean };
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth }));

import { XPixel } from "./XPixel";

type TwqWindow = Window & { twq?: { queue?: unknown[][] } };
const w = () => window as TwqWindow;
const fresh = () => ({ user: { id: "u1", email_confirmed_at: new Date().toISOString() } });

beforeEach(() => {
  delete w().twq;
  localStorage.clear();
  document.head.querySelectorAll("script[src*='ads-twitter']").forEach((s) => s.remove());
});
afterEach(() => vi.clearAllMocks());

describe("XPixel", () => {
  it("loads the pixel and queues the sign-up for a brand-new account", () => {
    auth = { session: fresh(), authReady: true };
    render(<XPixel />);
    const q = w().twq!.queue!;
    expect(q[0]).toEqual(["config", "rii1b"]);
    expect(q).toContainEqual(["event", "tw-rii1b-rii1k", { conversion_id: "u1" }]);
    expect(document.head.querySelector("script[src*='uwt.js']")).not.toBeNull();
  });

  it("fires the sign-up once per user", () => {
    auth = { session: fresh(), authReady: true };
    render(<XPixel />);
    delete w().twq;
    render(<XPixel />);
    expect(w().twq!.queue!.filter((a) => a[0] === "event")).toHaveLength(0);
  });

  it("does not fire for a returning user", () => {
    auth = { session: { user: { id: "u2", email_confirmed_at: "2026-01-01T00:00:00Z" } }, authReady: true };
    render(<XPixel />);
    expect(w().twq!.queue!.filter((a) => a[0] === "event")).toHaveLength(0);
  });

  it("loads nothing in an excluded browser", () => {
    localStorage.setItem("tailslips_exclude_analytics", "1");
    auth = { session: fresh(), authReady: true };
    render(<XPixel />);
    expect(w().twq).toBeUndefined();
    expect(document.head.querySelector("script[src*='uwt.js']")).toBeNull();
  });
});
