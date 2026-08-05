/** Pure gratuity math — tip presets, percentage tips, and bill-split allocation. */

/** Preset gratuity percentages offered on the settle modal and storefront checkout. */
export const TIP_PRESETS = [15, 18, 20] as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Tip as a percentage of a base amount (usually the pre-tip total), rounded to cents. */
export function computeTip(base: number, percent: number): number {
  if (!(base > 0) || !(percent > 0)) return 0;
  return round2((base * percent) / 100);
}

/**
 * Split a single bill-level tip across N order totals, proportional to each order's
 * share, rounded to cents. Any rounding remainder is handed to the largest fractional
 * shares so the parts sum back to `tip` exactly. Falls back to an even split when the
 * totals carry no positive weight.
 */
export function allocateTip(amounts: number[], tip: number): number[] {
  const n = amounts.length;
  if (n === 0) return [];
  if (round2(tip) <= 0) return amounts.map(() => 0);

  const cents = Math.round(round2(tip) * 100);
  const total = amounts.reduce((s, a) => s + a, 0);
  const weights = total > 0 ? amounts.map((a) => a / total) : amounts.map(() => 1 / n);

  const raw = weights.map((w) => w * cents);
  const result = raw.map((r) => Math.floor(r));
  let remainder = cents - result.reduce((s, f) => s + f, 0);

  const byFrac = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; remainder > 0; k = (k + 1) % n, remainder--) {
    result[byFrac[k].i]++;
  }

  return result.map((c) => c / 100);
}
