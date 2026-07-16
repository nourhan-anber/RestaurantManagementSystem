/** Format a numeric/decimal value as USD, e.g. 24 -> "$24.00". */
export function formatMoney(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toFixed(2)}`;
}

/** Convert a dollar amount (number or Decimal string) to integer cents for Stripe. */
export function toCents(value: number | string): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
