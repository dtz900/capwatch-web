export function formatUnits(units: number): string {
  const sign = units >= 0 ? "+" : "-";
  return `${sign}${Math.abs(units).toFixed(1)}`;
}

/**
 * Like formatUnits but switches to 2 decimals when the magnitude is below 1
 * so very small profits/losses don't render as "+0.0".
 */
export function formatUnitsSmart(units: number): string {
  const sign = units >= 0 ? "+" : "-";
  const abs = Math.abs(units);
  const decimals = abs < 1 ? 2 : 1;
  return `${sign}${abs.toFixed(decimals)}`;
}

export function formatRoi(pct: number): string {
  const sign = pct >= 0 ? "+" : "-";
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

export function formatWinRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function formatStreak(streak: number): string {
  if (streak > 0) return `W${streak}`;
  if (streak < 0) return `L${Math.abs(streak)}`;
  return "\u2014";
}

export function formatHandle(handle: string): string {
  return handle.startsWith("@") ? handle : `@${handle}`;
}
