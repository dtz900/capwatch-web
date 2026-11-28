/* eslint-disable @typescript-eslint/no-explicit-any -- loose test doubles for the supabase builder and auth context */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const mockAuth = vi.hoisted(() => ({ current: {} as any }));
const holder = vi.hoisted(() => ({ client: null as any }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => mockAuth.current }));
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabase: () => holder.client }));
import { MarketTailToggle } from "@/components/capper/MarketTailToggle";

type Op = {
  table: string;
  kind: "select" | "delete" | "insert";
  filters: Array<[string, unknown]>;
  payload?: unknown;
  /** delete().select(): the caller wants the deleted rows back. */
  returning: boolean;
};
type Result = { data?: any; error?: any };

/** Chainable stand-in for the supabase builder. Every terminal await resolves
 *  through `handler`, which sees the recorded op and returns the result. */
function fakeSupabase(handler: (op: Op) => Result | Promise<Result>) {
  const ops: Op[] = [];
  const client = {
    from(table: string) {
      const op: Op = { table, kind: "select", filters: [], returning: false };
      const run = () => {
        ops.push(op);
        return Promise.resolve(handler(op)).then((r) => ({ data: null, error: null, ...r }));
      };
      const chain: any = {
        select() {
          if (op.kind === "delete") op.returning = true;
          return chain;
        },
        delete() {
          op.kind = "delete";
          return chain;
        },
        insert(payload: unknown) {
          op.kind = "insert";
          op.payload = payload;
          return chain;
        },
        eq(col: string, val: unknown) {
          op.filters.push([col, val]);
          return chain;
        },
        maybeSingle: () => run(),
        then: (res: any, rej: any) => run().then(res, rej),
      };
      return chain;
    },
  };
  return { client, ops };
}

const SIGNED_IN = {
  session: { user: { id: "u1" } },
  entitlements: { isLoggedIn: true, isVip: false },
};

const marketOf = (op: Op) => op.filters.find(([c]) => c === "market")?.[1];

describe("MarketTailToggle", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    mockAuth.current = SIGNED_IN;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    holder.client = null;
  });

  it("renders nothing when logged out", () => {
    mockAuth.current = { session: null, entitlements: { isLoggedIn: false, isVip: false } };
    const { container } = render(<MarketTailToggle capperId={2} market="HRR" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the plain tail control for any signed-in user, no VIP required", async () => {
    holder.client = fakeSupabase(() => ({ data: null })).client;
    render(<MarketTailToggle capperId={2} market="HRR" />);
    expect(await screen.findByRole("button", { name: /^tail$/i })).toBeInTheDocument();
  });

  it("shows the tailing state when the market follow row exists", async () => {
    holder.client = fakeSupabase((op) => (op.kind === "select" ? { data: { market: "HRR" } } : {})).client;
    render(<MarketTailToggle capperId={2} market="HRR" />);
    expect(await screen.findByRole("button", { name: "✓" })).toBeEnabled();
  });

  it("pending guard: extra clicks while a toggle is in flight do nothing", async () => {
    let release!: (r: Result) => void;
    const gate = new Promise<Result>((r) => {
      release = r;
    });
    const { client, ops } = fakeSupabase((op) => {
      if (op.kind === "select") return { data: null };
      if (op.kind === "delete") return gate; // the 'all' conversion delete hangs
      return {};
    });
    holder.client = client;
    render(<MarketTailToggle capperId={2} market="HRR" />);
    const btn = await screen.findByRole("button", { name: /^tail$/i });
    await waitFor(() => expect(btn).toBeEnabled());

    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByRole("button")).toBeDisabled());
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));

    await act(async () => {
      release({ data: [] });
    });
    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
    expect(ops.filter((o) => o.kind === "delete")).toHaveLength(1);
    expect(ops.filter((o) => o.kind === "insert")).toHaveLength(1);
  });

  it("optimistic revert: a failed untail puts the check mark back", async () => {
    holder.client = fakeSupabase((op) => {
      if (op.kind === "select") return { data: { market: "HRR" } };
      return { error: { message: "boom" } };
    }).client;
    render(<MarketTailToggle capperId={2} market="HRR" />);
    fireEvent.click(await screen.findByRole("button", { name: "✓" }));
    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
    expect(screen.getByRole("button", { name: "✓" })).toBeInTheDocument();
  });

  it("optimistic revert: a failed tail insert goes back to Tail", async () => {
    const { client, ops } = fakeSupabase((op) => {
      if (op.kind === "insert") return { error: { message: "boom" } };
      return { data: op.kind === "delete" ? [] : null };
    });
    holder.client = client;
    render(<MarketTailToggle capperId={2} market="HRR" />);
    fireEvent.click(await screen.findByRole("button", { name: /^tail$/i }));
    await waitFor(() => expect(ops.some((o) => o.kind === "insert")).toBe(true));
    await waitFor(() => expect(screen.getByRole("button", { name: /^tail$/i })).toBeEnabled());
    // Nothing to restore: there was no whole-capper row.
    expect(ops.filter((o) => o.kind === "insert")).toHaveLength(1);
  });

  it("conversion: tailing a market drops the 'all' row and carries its stake into the scoped row", async () => {
    const { client, ops } = fakeSupabase((op) => {
      if (op.kind === "delete") return { data: [{ market: "all", default_stake: 5 }] };
      return {};
    });
    holder.client = client;
    render(<MarketTailToggle capperId={2} market="HRR" />);
    fireEvent.click(await screen.findByRole("button", { name: /^tail$/i }));
    expect(await screen.findByRole("button", { name: "✓" })).toBeInTheDocument();

    const del = ops.find((o) => o.kind === "delete")!;
    expect(del.returning).toBe(true);
    expect(marketOf(del)).toBe("all");
    const ins = ops.find((o) => o.kind === "insert")!;
    expect(ins.payload).toEqual({ user_id: "u1", capper_id: 2, market: "HRR", default_stake: 5 });
  });

  it("conversion: a failed scoped insert restores the whole-capper tail with its stake", async () => {
    const { client, ops } = fakeSupabase((op) => {
      if (op.kind === "delete") return { data: [{ market: "all", default_stake: 5 }] };
      if (op.kind === "insert" && (op.payload as any).market === "HRR") return { error: { message: "boom" } };
      return {};
    });
    holder.client = client;
    render(<MarketTailToggle capperId={2} market="HRR" />);
    fireEvent.click(await screen.findByRole("button", { name: /^tail$/i }));
    await waitFor(() => expect(ops.filter((o) => o.kind === "insert")).toHaveLength(2));
    expect(ops.filter((o) => o.kind === "insert")[1].payload).toEqual({
      user_id: "u1",
      capper_id: 2,
      market: "all",
      default_stake: 5,
    });
    expect(await screen.findByRole("button", { name: /^tail$/i })).toBeEnabled();
  });

  it("conversion: a failed 'all' delete reverts and never inserts", async () => {
    const { client, ops } = fakeSupabase((op) => (op.kind === "delete" ? { error: { message: "boom" } } : {}));
    holder.client = client;
    render(<MarketTailToggle capperId={2} market="HRR" />);
    fireEvent.click(await screen.findByRole("button", { name: /^tail$/i }));
    await waitFor(() => expect(ops.some((o) => o.kind === "delete")).toBe(true));
    await waitFor(() => expect(screen.getByRole("button", { name: /^tail$/i })).toBeEnabled());
    expect(ops.some((o) => o.kind === "insert")).toBe(false);
  });
});
