export function formatUnits(units: number): string {
  const sign = units >= 0 ? "+" : "-";
  return `${sign}${Math.abs(units).toFixed(1)}`;
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
