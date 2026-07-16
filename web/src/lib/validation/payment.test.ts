import { describe, expect, it } from 'vitest';
import { settleBillSchema } from './payment';

describe('settleBillSchema', () => {
  it('accepts cash without a transaction id', () => {
    expect(settleBillSchema.safeParse({ method: 'CASH' }).success).toBe(true);
  });

  it('requires a transaction id for card', () => {
    expect(settleBillSchema.safeParse({ method: 'CARD' }).success).toBe(false);
    expect(settleBillSchema.safeParse({ method: 'CARD', transactionId: 'auth_123' }).success).toBe(true);
  });

  it('rejects an unknown method', () => {
    expect(settleBillSchema.safeParse({ method: 'CRYPTO' }).success).toBe(false);
  });
});
