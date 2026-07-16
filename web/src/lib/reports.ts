/** Percentage of the max, for horizontal bar widths (0 when max is 0). */
export function percentOfMax(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((value / max) * 100);
}

/** Average that is 0 (not NaN) when count is 0. */
export function safeAverage(total: number, count: number): number {
  return count > 0 ? total / count : 0;
}
