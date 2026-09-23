import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const nav = vi.hoisted(() => ({ params: new URLSearchParams("") }));
vi.mock("next/navigation", () => ({ useSearchParams: () => nav.params }));

import { CallbackErrorBanner } from "./CallbackErrorBanner";

describe("CallbackErrorBanner", () => {
  it("renders nothing without an error param", () => {
    nav.params = new URLSearchParams("");
    const { container } = render(<CallbackErrorBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the callback error once", () => {
    nav.params = new URLSearchParams("error=User%20denied");
    render(<CallbackErrorBanner />);
    expect(screen.getByRole("alert")).toHaveTextContent("User denied");
  });
});
