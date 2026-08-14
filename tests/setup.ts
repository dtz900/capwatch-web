import "@testing-library/jest-dom";
import { vi } from "vitest";

// next/font/google runs through a Next-only build transform; under Vite the
// raw package throws ("Titan_One is not a function") the moment a component
// module imports it, which aborted 8 component suites at collection time
// (Codex, capwatch-web #65). The proxy stubs EVERY font export so new fonts
// never re-break the suites.
const fontStub = () => ({ className: "font-mock", style: { fontFamily: "font-mock" } });
vi.mock("next/font/google", () => ({
  // vitest snapshots the factory's keys, so every font the app imports must
  // be listed explicitly (a Proxy can't fake the namespace). Adding a new
  // font to the app means adding it here too.
  Titan_One: fontStub,
  Manrope: fontStub,
  Cinzel: fontStub,
}));
