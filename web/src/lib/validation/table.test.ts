import { describe, expect, it } from 'vitest';
import { tableInputSchema } from './table';

describe('tableInputSchema', () => {
  it('coerces string inputs from a form', () => {
    const parsed = tableInputSchema.parse({ number: '7', capacity: '4', isActive: true });
    expect(parsed).toEqual({ number: 7, capacity: 4, isActive: true });
  });

  it('rejects a non-positive table number', () => {
    expect(tableInputSchema.safeParse({ number: 0, capacity: 4, isActive: true }).success).toBe(false);
  });

  it('rejects a non-integer table number', () => {
    expect(tableInputSchema.safeParse({ number: 1.5, capacity: 4, isActive: true }).success).toBe(false);
  });

  it('rejects capacity over the max', () => {
    expect(tableInputSchema.safeParse({ number: 1, capacity: 500, isActive: true }).success).toBe(false);
  });
});
