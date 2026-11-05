import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TofPrizeDetails, TofPrizeStickers } from "./TofPrizeCallouts";
import { sponsorDisplay, type TofPrize } from "@/lib/tof/prize";

const prize: TofPrize = { enabled: true, amount: "$25", sponsor_handle: "doctorsportshq", sponsor_name: "DSHQ",
  sponsor_logo: "/sponsors/dshq-wordmark.png", starts: "2026-11-03", ends: null };

describe("Tail or Fade prize callouts", () => {
  it("title stickers show the amount and the sponsor, and read out for screen readers", () => {
    render(<TofPrizeStickers active={{ prize, live: true }} />);
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getAllByAltText("DSHQ").length).toBeGreaterThan(0);
    expect(screen.getByText("$25 weekly prize, sponsored by DSHQ")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();     // inside the title button: no nested link
  });

  it("details list the contest rules and the sponsor", () => {
    render(<TofPrizeDetails active={{ prize, live: true }} />);
    expect(screen.getByText("Win $25 every week")).toBeInTheDocument();
    expect(screen.getByText("Min 10 graded plays to qualify")).toBeInTheDocument();
    expect(screen.getByText("Winner announced every Tuesday")).toBeInTheDocument();
    expect(screen.getByText("@doctorsportshq")).toBeInTheDocument();
  });

  it("only trusts sponsor logos from our own /sponsors folder", () => {
    expect(sponsorDisplay(prize).logo).toBe("/sponsors/dshq-wordmark.png");
    expect(sponsorDisplay({ ...prize, sponsor_logo: "https://evil.example/x.png" }).logo).toBeNull();
    expect(sponsorDisplay({ ...prize, sponsor_name: undefined }).name).toBe("@doctorsportshq");
  });
});
