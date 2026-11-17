import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TofPrizeDetails, TofPrizeStickers } from "./TofPrizeCallouts";
import { sponsorDisplay, type TofPrize } from "@/lib/tof/prize";

const prize: TofPrize = { enabled: true, amount: "$25", sponsor_handle: "acmepicks", sponsor_name: "ACME",
  sponsor_logo: "/sponsors/acme-wordmark.png", starts: "2026-11-03", ends: null };

describe("Tail or Fade prize callouts", () => {
  it("title stickers show the amount and the sponsor, and read out for screen readers", () => {
    render(<TofPrizeStickers active={{ prize, live: true }} />);
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getAllByAltText("ACME").length).toBeGreaterThan(0);
    expect(screen.getByText("$25 weekly prize, sponsored by ACME")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();     // inside the title button: no nested link
  });

  it("details list the contest rules and the sponsor", () => {
    render(<TofPrizeDetails active={{ prize, live: true }} />);
    expect(screen.getByText("Win $25 every week")).toBeInTheDocument();
    expect(screen.getByText("Min 10 graded plays to qualify")).toBeInTheDocument();
    expect(screen.getByText("Winner announced every Tuesday")).toBeInTheDocument();
    expect(screen.getByText("@acmepicks")).toBeInTheDocument();
  });

  it("with no sponsor the prize stands alone: no sponsor tag, link or wording", () => {
    const solo: TofPrize = { enabled: true, amount: "$25", starts: "2026-11-03", ends: null };
    const { unmount } = render(<TofPrizeStickers active={{ prize: solo, live: true }} />);
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getByText("$25 weekly prize")).toBeInTheDocument();
    expect(screen.queryByText(/Sponsored by/i)).toBeNull();
    unmount();
    render(<TofPrizeDetails active={{ prize: solo, live: true }} />);
    expect(screen.getByText("Win $25 every week")).toBeInTheDocument();
    expect(screen.queryByText(/Sponsored by/i)).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("says this week when the prize is on its last week", () => {
    const d = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    render(<TofPrizeDetails active={{ prize: { enabled: true, amount: "$25", starts: "2026-11-03", ends: d }, live: true }} />);
    expect(screen.getByText("Win $25 this week")).toBeInTheDocument();
  });

  it("only trusts sponsor logos from our own /sponsors folder", () => {
    expect(sponsorDisplay(prize)?.logo).toBe("/sponsors/acme-wordmark.png");
    expect(sponsorDisplay({ ...prize, sponsor_logo: "https://evil.example/x.png" })?.logo).toBeNull();
    expect(sponsorDisplay({ ...prize, sponsor_name: undefined })?.name).toBe("@acmepicks");
  });
});
