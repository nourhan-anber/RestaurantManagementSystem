/** Pure loyalty math — points earned on spend and the cash value of redeemed points. */

/** Whole points earned on a spend amount (floored). */
export function pointsEarned(spend: number, pointsPerDollar: number): number {
  if (!(spend > 0) || !(pointsPerDollar > 0)) return 0;
  return Math.floor(spend * pointsPerDollar);
}

/** The cash value (rounded to cents) of redeeming `points`. */
export function redeemValue(points: number, valuePerPoint: number): number {
  if (!(points > 0) || !(valuePerPoint > 0)) return 0;
  return Math.round(points * valuePerPoint * 100) / 100;
}

/**
 * The most points that can be redeemed without the discount exceeding `maxDiscount`
 * (e.g. the order total) or the customer's balance.
 */
export function maxRedeemablePoints(points: number, valuePerPoint: number, maxDiscount: number): number {
  if (!(points > 0) || !(valuePerPoint > 0) || !(maxDiscount > 0)) return 0;
  const affordable = Math.floor(maxDiscount / valuePerPoint);
  return Math.max(0, Math.min(points, affordable));
}
