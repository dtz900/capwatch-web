// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FieldRow } from "./FieldRow";

const state = { key: "player" as const, label: "Player", value: "D. Acuff", red: false, note: null, fixed: true };

describe("FieldRow", () => {
  it("a fixed field is a button that reopens the editor", () => {
    const onToggle = vi.fn();
    render(
      <FieldRow state={state} open={false} onToggle={onToggle}>
        <div>editor</div>
      </FieldRow>,
    );
    expect(screen.queryByText("editor")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Fixed" }));
    expect(onToggle).toHaveBeenCalled();
  });
  it("shows the editor when open", () => {
    render(
      <FieldRow state={state} open onToggle={() => {}}>
        <div>editor</div>
      </FieldRow>,
    );
    expect(screen.getByText("editor")).toBeTruthy();
  });
});
