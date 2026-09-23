import { describe, expect, it } from "vitest";
import { AVATAR_MAX_INPUT_BYTES, avatarObjectPath, cropRect, validateAvatarFile } from "./avatar";

describe("validateAvatarFile", () => {
  it("accepts jpeg, png and webp under the cap", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateAvatarFile({ type, size: 1000 })).toBeNull();
    }
  });
  it("rejects HEIC and other types with a plain message", () => {
    expect(validateAvatarFile({ type: "image/heic", size: 1000 })).toBe("Use a JPG, PNG or WebP photo.");
    expect(validateAvatarFile({ type: "", size: 1000 })).toBe("Use a JPG, PNG or WebP photo.");
  });
  it("rejects oversized inputs before any upload", () => {
    expect(validateAvatarFile({ type: "image/jpeg", size: AVATAR_MAX_INPUT_BYTES + 1 })).toBe("That photo is over 8MB. Pick a smaller one.");
  });
});

describe("cropRect", () => {
  it("takes the centered square of a landscape image", () => {
    expect(cropRect(1000, 400)).toEqual({ sx: 300, sy: 0, size: 400 });
  });
  it("takes the centered square of a portrait image", () => {
    expect(cropRect(400, 1000)).toEqual({ sx: 0, sy: 300, size: 400 });
  });
  it("is the whole image when already square", () => {
    expect(cropRect(500, 500)).toEqual({ sx: 0, sy: 0, size: 500 });
  });
});

describe("avatarObjectPath", () => {
  it("is one fixed file per user", () => {
    expect(avatarObjectPath("9ff12b2a-e83d-401c-a024-8dab1a0ce890")).toBe("9ff12b2a-e83d-401c-a024-8dab1a0ce890/avatar.jpg");
  });
});
