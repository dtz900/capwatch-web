/* Price parsing and formatting for the pick builder. Conversions live in
 * @/lib/vip/odds; prices move in probability space, never by adding cents. */
import { americanToDecimal, decimalToAmerican } from "@/lib/vip/odds";

export type Fmt = "american" | "decimal";

export const toDecimal = americanToDecimal;
export const toAmerican = decimalToAmerican;

export const fmtAmerican = (a: number) => (a > 0 ? `+${a}` : `${a}`);

export const fmtPrice = (a: number, fmt: Fmt) =>
  fmt === "decimal" ? toDecimal(a).toFixed(2) : fmtAmerican(a);

/** Accepts either format, whatever the toggle says: "+150", "-110", "150",
 *  "2.50", "1.91". Returns American, or null if it isn't a sane price. */
export function parsePrice(raw: string): number | null {
  const t = raw.trim().replace(/^\+/, "");
  if (t === "") return null;
  if (/^\d+\.\d+$/.test(t) || /^\d{1,2}$/.test(t)) {
    const d = Number(t);
    return d >= 1.01 && d <= 51 ? toAmerican(d) : null;
  }
  if (!/^-?\d{3,5}$/.test(t)) return null;
  const a = Number(t);
  return Math.abs(a) >= 100 && Math.abs(a) <= 10000 ? a : null;
}

/** a pays more than b for the bettor. */
export const pays = (a: number, b: number) => toDecimal(a) > toDecimal(b) + 1e-9;
