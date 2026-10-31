import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/seller-agreement",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/components/nav/TopNav", () => ({ TopNav: () => null }));

import SellerAgreement from "./page";
import Terms from "../terms/page";
import { subscriberDisclosure } from "@/lib/vip/terms";

describe("seller agreement page", () => {
  it("has one heading per section, in order", () => {
    const { container } = render(<SellerAgreement />);
    const heads = Array.from(container.querySelectorAll("h2")).map((h) => h.textContent);
    expect(heads).toEqual([
      "1. Who sells",
      "2. Fees",
      "3. Payouts and taxes",
      "4. Refunds and chargebacks",
      "5. Who can sell",
      "6. Billing pause",
      "7. Stop selling",
      "8. Content rules",
      "9. Shutoff",
      "10. Stripe",
      "11. Changes and contact",
    ]);
  });

  it("links the Stripe Connected Account Agreement", () => {
    const { container } = render(<SellerAgreement />);
    const link = container.querySelector('a[href="https://stripe.com/connect-account/legal/full"]');
    expect(link).not.toBeNull();
  });

  it("states the 15% fee and 85% net", () => {
    const { container } = render(<SellerAgreement />);
    expect(container.textContent).toMatch(/15%/);
    expect(container.textContent).toMatch(/85%/);
  });
});

describe("legal copy", () => {
  const BAD = /\u2014|--/;

  it("seller agreement has no em dashes or double hyphens", () => {
    const { container } = render(<SellerAgreement />);
    expect(container.textContent ?? "").not.toMatch(BAD);
  });

  it("subscriber disclosure has no em dashes or double hyphens", () => {
    expect(subscriberDisclosure(2500)).not.toMatch(BAD);
    expect(subscriberDisclosure(2550)).not.toMatch(BAD);
  });

  it("ToS Capper VIP section exists, covers the required topics, and has no em dashes", () => {
    const { container } = render(<Terms />);
    const heads = Array.from(container.querySelectorAll("h2"));
    const start = heads.findIndex((h) => h.textContent === "Capper VIP subscriptions");
    expect(start).toBeGreaterThanOrEqual(0);
    const parts: string[] = [];
    for (let el = heads[start].nextElementSibling; el && el.tagName !== "H2"; el = el.nextElementSibling) {
      parts.push(el.textContent ?? "");
    }
    const text = parts.join(" ");
    expect(text).not.toMatch(BAD);
    for (const topic of [/renews/i, /no refunds/i, /pause/i, /stops selling/i, /merchant of record|seller/i, /not betting advice/i, /21/]) {
      expect(text).toMatch(topic);
    }
  });
});
