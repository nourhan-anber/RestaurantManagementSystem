/** Format a numeric/decimal value as USD, e.g. 24 -> "$24.00". */
export function formatMoney(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toFixed(2)}`;
}
