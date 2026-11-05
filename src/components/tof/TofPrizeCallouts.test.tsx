import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TofPrizeBadge, TofPrizeDetails } from "./TofPrizeCallouts";
import { sponsorDisplay, type TofPrize } from "@/lib/tof/prize";

const prize: TofPrize = { enabled: true, amount: "$25", sponsor_handle: "doctorsportshq", sponsor_name: "DSHQ",
  sponsor_logo: "/sponsors/dshq.jpg", starts: "2026-11-03", ends: null };

describe("Tail or Fade prize callouts", () => {
  it("badge shows the $25 and names the sponsor with a link to their X", () => {
    render(<TofPrizeBadge active={{ prize, live: true }} />);
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getByText("Weekly prize")).toBeInTheDocument();
    expect(screen.getByText("DSHQ")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://x.com/doctorsportshq");
  });

  it("details list the contest rules and the sponsor", () => {
    render(<TofPrizeDetails active={{ prize, live: true }} />);
    expect(screen.getByText("Win $25 every week")).toBeInTheDocument();
    expect(screen.getByText("Min 10 graded plays to qualify")).toBeInTheDocument();
    expect(screen.getByText("Winner announced every Tuesday")).toBeInTheDocument();
    expect(screen.getByText("@doctorsportshq")).toBeInTheDocument();
  });

  it("only trusts sponsor logos from our own /sponsors folder", () => {
    expect(sponsorDisplay(prize).logo).toBe("/sponsors/dshq.jpg");
    expect(sponsorDisplay({ ...prize, sponsor_logo: "https://evil.example/x.png" }).logo).toBeNull();
    expect(sponsorDisplay({ ...prize, sponsor_name: undefined }).name).toBe("@doctorsportshq");
  });
});
