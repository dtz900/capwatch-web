import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import NcaabSlateFixturePage from "./page";

afterEach(() => vi.unstubAllEnvs());

describe("ncaab slate fixture page", () => {
  it("404s without the flag", () => {
    vi.stubEnv("NEXT_PUBLIC_NCAAB_FIXTURES", "false");
    expect(() => render(<NcaabSlateFixturePage />)).toThrow(/404/);
  });

  it("404s in production even with the flag", () => {
    vi.stubEnv("NEXT_PUBLIC_NCAAB_FIXTURES", "true");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(() => render(<NcaabSlateFixturePage />)).toThrow(/404/);
  });

  it("renders with the flag outside production", () => {
    vi.stubEnv("NEXT_PUBLIC_NCAAB_FIXTURES", "true");
    vi.stubEnv("VERCEL_ENV", "preview");
    const { container } = render(<NcaabSlateFixturePage />);
    expect(container.querySelector("[data-testid='ncaab-slate']")).not.toBeNull();
  });
});
