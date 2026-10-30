import { describe, it, expect } from "vitest";
import { avatarSrc } from "@/lib/avatarSrc";

describe("avatarSrc", () => {
  it("routes X avatars through the next/image proxy", () => {
    const u = "https://pbs.twimg.com/profile_images/2057525414260621312/pyymeu1y.jpg";
    expect(avatarSrc(u)).toBe(`/_next/image?url=${encodeURIComponent(u)}&w=128&q=75`);
  });

  it("passes other hosts through unchanged", () => {
    const u = "https://example.supabase.co/storage/v1/object/public/avatars/a.png";
    expect(avatarSrc(u)).toBe(u);
  });

  it("returns null for a missing url", () => {
    expect(avatarSrc(null)).toBeNull();
    expect(avatarSrc("")).toBeNull();
  });
});
