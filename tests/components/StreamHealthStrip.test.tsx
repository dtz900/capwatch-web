import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const fetchStreamHealth = vi.hoisted(() => vi.fn());
vi.mock("@/app/admin/pipeline/actions", () => ({ fetchStreamHealth }));
import { StreamHealthStrip } from "@/app/admin/pipeline/StreamHealthStrip";

const base = {
  status: "ok",
  worker_alive: true,
  connected_since_start: true,
  capture_age_minutes: 3,
  heartbeat_age_minutes: 2,
  last_capture_at: "2026-11-27T20:00:00Z",
  last_connected_at: "2026-11-27T10:00:00Z",
  last_worker_starting_at: "2026-11-27T09:59:00Z",
  last_heartbeat_at: "2026-11-27T20:01:00Z",
  last_gap_sweep_at: null,
  last_stalled_at: null,
  last_watchdog_exit_at: null,
  checked_at: "2026-11-27T20:03:00Z",
};

describe("StreamHealthStrip", () => {
  beforeEach(() => {
    fetchStreamHealth.mockReset();
  });

  it("renders the status and the ages", async () => {
    fetchStreamHealth.mockResolvedValue({ ok: true, data: base });
    render(<StreamHealthStrip />);
    expect(await screen.findByText("● ok")).toBeInTheDocument();
    expect(screen.getByText("3m ago")).toBeInTheDocument();
    expect(screen.getByText("2m ago")).toBeInTheDocument();
  });

  it("flags a stale stream", async () => {
    fetchStreamHealth.mockResolvedValue({
      ok: true,
      data: { ...base, status: "stale", worker_alive: false, capture_age_minutes: 90, heartbeat_age_minutes: null },
    });
    render(<StreamHealthStrip />);
    expect(await screen.findByText("● stale")).toBeInTheDocument();
    expect(screen.getByText("1h 30m ago")).toBeInTheDocument();
  });

  it("shows a clear error when the endpoint fails, never a blank", async () => {
    fetchStreamHealth.mockResolvedValue({ ok: false, error: "503: Admin auth not configured" });
    render(<StreamHealthStrip />);
    expect(await screen.findByText("Stream health: error")).toBeInTheDocument();
    expect(screen.getByText("503: Admin auth not configured")).toBeInTheDocument();
  });

  it("shows an error when the server action itself throws", async () => {
    fetchStreamHealth.mockImplementation(async () => { throw new Error("action blew up"); });
    render(<StreamHealthStrip />);
    expect(await screen.findByText("action blew up")).toBeInTheDocument();
  });
});
