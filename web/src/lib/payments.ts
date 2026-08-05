export type SettleMethod = 'CASH' | 'CARD' | 'OTHER';

export const SETTLE_METHOD_LABELS: Record<SettleMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  OTHER: 'Other',
};

export const SETTLE_METHODS = Object.keys(SETTLE_METHOD_LABELS) as SettleMethod[];

/** Card settlements must carry a transaction/reference id; cash/other need not. */
export function requiresReference(method: SettleMethod): boolean {
  return method === 'CARD';
}
