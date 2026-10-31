import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { VipCapperStatus } from "@/lib/vip/types";
import type { VipReceipt } from "@/lib/vip/promote";

const client = vi.hoisted(() => ({ getVipReceipts: vi.fn() }));
vi.mock("@/lib/vip/client", () => client);

import { PromotePanel } from "./PromotePanel";

const status: VipCapperStatus = {
  seller: { price_cents: 1500, founding: false, status: "active" },
  eligibility: [
    { sport: "NBA", eligible: true, eligible_since: "2026-10-01", units: 6.5, n_picks: 24, n_floor_picks: 24, run_date: null },
  ],
  sport_field: { NBA: { qualified: 7, active: 93 } },
  door_open: true,
  viewer: { subscribed: false, is_owner: true },
  vip_record: { n: 0, wins: 0, losses: 0, pushes: 0, units: 0 },
  locked: [],
};

const receipt = (id: string, selection: string): VipReceipt => ({
  ticket_id: id, sport: "NBA", posted_at: "2026-10-31T15:42:00Z", commence_time: "2026-10-31T16:00:00Z",
  odds: -110, units: 1, profit_units: 0.91,
  legs: [{
    id: 1, sport: "NBA", market: "moneyline", selection, line: null, odds_taken: -110, units: 1,
    posted_at: "2026-10-31T15:42:00Z", reveal_at: "2026-10-31T16:30:00Z", game_id: "1", parlay_id: null,
    parlay_leg_index: null,
  }],
});

function open() {
  fireEvent.click(screen.getByRole("button", { name: /^Promote/ }));
}

describe("PromotePanel", () => {
  beforeEach(() => {
    client.getVipReceipts.mockReset();
  });

  it("stays closed until opened, then shows only cards the record backs", async () => {
    client.getVipReceipts.mockResolvedValue({ receipts: [] });
    render(<PromotePanel handle="zz_viptest" capperId={325} status={status} token="tok" />);
    expect(screen.queryByRole("img", { name: /card/ })).toBeNull();
    expect(client.getVipReceipts).not.toHaveBeenCalled();
    open();
    expect(await screen.findByRole("img", { name: "TailSlips VIP card" })).toHaveAttribute(
      "src",
      "/cappers/zz_viptest/vip-card/brand",
    );
    expect(screen.getByRole("img", { name: "Now selling VIP card" })).toBeInTheDocument();
    // No graded VIP picks and no wins yet: no record or receipt card.
    expect(screen.queryByRole("img", { name: "VIP record card" })).toBeNull();
    expect(screen.queryByRole("img", { name: "Winning pick receipt card" })).toBeNull();
    expect(client.getVipReceipts).toHaveBeenCalledWith(325, "tok");
  });

  it("Post to X carries the text and the share link", async () => {
    client.getVipReceipts.mockResolvedValue({ receipts: [] });
    render(<PromotePanel handle="zz_viptest" capperId={325} status={status} token="tok" />);
    open();
    const links = await screen.findAllByRole("link", { name: /Post to X/ });
    const url = new URL(links[0].getAttribute("href") ?? "");
    expect(url.origin + url.pathname).toBe("https://x.com/intent/post");
    expect(url.searchParams.get("text")).toMatch(/^I'm 1 of 7 NBA cappers eligible to sell VIP on @tailslips\./);
    expect(url.searchParams.get("url")).toBe("https://tailslips.com/cappers/zz_viptest/promo/brand");
  });

  it("receipt card follows the picked winning ticket", async () => {
    client.getVipReceipts.mockResolvedValue({ receipts: [receipt("s1", "Lakers"), receipt("s2", "Jazz")] });
    render(<PromotePanel handle="zz_viptest" capperId={325} status={status} token="tok" />);
    open();
    const img = await screen.findByRole("img", { name: "Winning pick receipt card" });
    expect(img).toHaveAttribute("src", "/cappers/zz_viptest/vip-card/receipt?t=s1");
    fireEvent.change(screen.getByLabelText("Winning pick"), { target: { value: "s2" } });
    expect(img).toHaveAttribute("src", "/cappers/zz_viptest/vip-card/receipt?t=s2");
    expect(screen.getByText(/VIP cashed\. Jazz \(-110\)/)).toBeInTheDocument();
  });

  it("copies the post text with its link", async () => {
    client.getVipReceipts.mockResolvedValue({ receipts: [] });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<PromotePanel handle="zz_viptest" capperId={325} status={status} token="tok" />);
    open();
    fireEvent.click((await screen.findAllByRole("button", { name: "Copy text" }))[0]);
    await vi.waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\nhttps:\/\/tailslips\.com\/cappers\/zz_viptest\/promo\/brand$/)),
    );
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });
});
