import { describe, it, expect } from "vitest";
import { normalizeUsername, isBlockedUsername, UNAMBIGUOUS_ROOTS, AMBIGUOUS_ROOTS } from "@/lib/tof/blocklist";

describe("normalizeUsername", () => {
  it("lowercases", () => {
    expect(normalizeUsername("FaDeAI")).toBe("fadeai");
  });
  it("maps leetspeak digits and symbols to letters", () => {
    expect(normalizeUsername("5h1t")).toBe("shit");
    expect(normalizeUsername("a55")).toBe("as");
    expect(normalizeUsername("f4g")).toBe("fag");
    expect(normalizeUsername("@ss")).toBe("as");
    expect(normalizeUsername("$lut")).toBe("slut");
  });
  it("strips underscores and dots", () => {
    expect(normalizeUsername("f_u_c_k")).toBe("fuck");
    expect(normalizeUsername("f.u.c.k")).toBe("fuck");
  });
  it("strips digits sandwiched between letters, but not other digits", () => {
    expect(normalizeUsername("fu2ck")).toBe("fuck");
    expect(normalizeUsername("f2u6c8k")).toBe("fuck");
    expect(normalizeUsername("fuck99")).toBe("fuck99");
    expect(normalizeUsername("99fuck")).toBe("99fuck");
  });
  it("collapses repeated letters", () => {
    expect(normalizeUsername("ffuuuuccckkk")).toBe("fuck");
    expect(normalizeUsername("shiiiit")).toBe("shit");
  });
  it("leaves an ordinary name alone", () => {
    expect(normalizeUsername("dt_fades")).toBe("dtfades");
    expect(normalizeUsername("classic")).toBe("clasic");
  });
});

describe("isBlockedUsername: unambiguous tier (substring match)", () => {
  it("blocks a root found anywhere in the normalized name", () => {
    expect(isBlockedUsername("fuckboy")).toBe(true);
    expect(isBlockedUsername("the_fuck_man")).toBe(true);
    expect(isBlockedUsername("xXnigger99")).toBe(true);
    expect(isBlockedUsername("f.u.c.k.boy")).toBe(true);
    expect(isBlockedUsername("5lutposter")).toBe(true);
  });
  it("covers every listed unambiguous root as a standalone name", () => {
    for (const root of UNAMBIGUOUS_ROOTS) {
      expect(isBlockedUsername(root)).toBe(true);
    }
  });
});

describe("isBlockedUsername: ambiguous tier (whole-token match only)", () => {
  it("blocks the bare root", () => {
    for (const root of AMBIGUOUS_ROOTS) {
      expect(isBlockedUsername(root)).toBe(true);
    }
  });
  it("lets common innocent words containing an ambiguous root through", () => {
    const innocent = [
      "classic", "assist", "bass", "glass", "password", // ass
      "scunthorpe", // cunt
      "cockburn", "hitchcock", "shuttlecock", "peacock", // cock
      "shitake", // shit
      "cumulative", "circumstance", "document", "cucumber", // cum
      "title", "attitude", "constitution", "institute", // tit
      "dickens", "dickey", // dick
      "grape", "drape", // rape
      "analysis", "analog", "canal", "banal", // anal
      "pakistan", "pakistani", // paki
      "raccoon", "cocoon", "tycoon", // coon
      "despicable", // spic
      "retardant", // retard
      "shoe", "horseshoe", // hoe
      "homogeneous", "homonym", "homogenize", // homo
      "booby", // boob
    ];
    for (const name of innocent) {
      expect(isBlockedUsername(name)).toBe(false);
    }
  });
});

describe("isBlockedUsername: the Niger/Nigeria and episcopal collisions", () => {
  // Collapsing repeated letters turns "nigger" into "niger" (the country)
  // and "piss" into "pis" (a substring of episcopal/epistle). The blocklist
  // carries a narrow, documented exception for exactly these two so the
  // country and the religious terms pass while the slur and the profanity
  // still get caught, including obfuscated spellings of them.
  it("lets Nigeria and Nigerian through, with or without trailing digits", () => {
    expect(isBlockedUsername("nigeria")).toBe(false);
    expect(isBlockedUsername("nigerian")).toBe(false);
    expect(isBlockedUsername("nigeria22")).toBe(false);
    expect(isBlockedUsername("proud_nigerian")).toBe(false);
  });
  it("still blocks nigger and obfuscated spellings of it", () => {
    expect(isBlockedUsername("nigger")).toBe(true);
    expect(isBlockedUsername("niggger")).toBe(true);
    expect(isBlockedUsername("n1gger")).toBe(true);
    expect(isBlockedUsername("n_i_g_g_e_r")).toBe(true);
  });
  it("blocks bare 'niger' alone (a deliberate, documented tradeoff)", () => {
    expect(isBlockedUsername("niger")).toBe(true);
  });
  it("lets episcopal, epistle, and epistemology through", () => {
    expect(isBlockedUsername("episcopal")).toBe(false);
    expect(isBlockedUsername("episcopalian")).toBe(false);
    expect(isBlockedUsername("epistle")).toBe(false);
    expect(isBlockedUsername("epistemology")).toBe(false);
  });
  it("still blocks piss and obfuscated spellings of it", () => {
    expect(isBlockedUsername("piss")).toBe(true);
    expect(isBlockedUsername("piiisss")).toBe(true);
    expect(isBlockedUsername("p1ss")).toBe(true);
  });
  it("a slur next to the safe word still blocks on the other root", () => {
    expect(isBlockedUsername("nigeria_fuck")).toBe(true);
  });
});

describe("isBlockedUsername: never flags neutral identity terms", () => {
  it("passes orientation/identity words that are not slurs", () => {
    for (const name of ["gay", "lesbian", "trans", "queer", "bi", "nonbinary"]) {
      expect(isBlockedUsername(name)).toBe(false);
    }
  });
});

describe("isBlockedUsername: edge cases", () => {
  it("returns false for an empty or whitespace-only name", () => {
    expect(isBlockedUsername("")).toBe(false);
  });
  it("is case-insensitive", () => {
    expect(isBlockedUsername("FUCKboy")).toBe(true);
    expect(isBlockedUsername("CUNT")).toBe(true);
  });
});
