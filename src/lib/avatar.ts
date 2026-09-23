/* Board photo upload. The browser crops to a small square JPEG before the
   bucket ever sees the file, so a phone photo never lands in storage at
   full size (bucket cap 512KB, migration 2026-09-23_tof_x_verification.sql). */

export const AVATAR_SIZE = 256;
export const AVATAR_MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_BUCKET = "tof-avatars";

export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Use a JPG, PNG or WebP photo.";
  if (file.size > AVATAR_MAX_INPUT_BYTES) return "That photo is over 8MB. Pick a smaller one.";
  return null;
}

/** Centered square source rectangle. */
export function cropRect(width: number, height: number): { sx: number; sy: number; size: number } {
  const size = Math.min(width, height);
  return { sx: Math.floor((width - size) / 2), sy: Math.floor((height - size) / 2), size };
}

export function avatarObjectPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

export async function cropToSquareJpeg(file: Blob, size: number = AVATAR_SIZE): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const { sx, sy, size: src } = cropRect(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the photo.");
    ctx.drawImage(bitmap, sx, sy, src, src, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not prepare the photo."))), "image/jpeg", 0.85);
    });
  } finally {
    bitmap.close();
  }
}
