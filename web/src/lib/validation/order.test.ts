import { describe, expect, it } from 'vitest';
import { placeOnlineOrderSchema, placeOrderSchema } from './order';

const valid = {
  slug: 'bella-vista',
  tableNumber: 7,
  token: 'abc',
  items: [{ menuItemId: 1, quantity: 2 }],
};

describe('placeOrderSchema', () => {
  it('accepts a valid order', () => {
    expect(placeOrderSchema.safeParse(valid).success).toBe(true);
  });

  it('requires at least one item', () => {
    expect(placeOrderSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it('rejects a non-positive quantity', () => {
    expect(
      placeOrderSchema.safeParse({ ...valid, items: [{ menuItemId: 1, quantity: 0 }] }).success,
    ).toBe(false);
  });

  it('rejects a missing token', () => {
    expect(placeOrderSchema.safeParse({ ...valid, token: '' }).success).toBe(false);
  });

  it('defaults optionIds to [] and accepts guest fields', () => {
    const parsed = placeOrderSchema.parse({ ...valid, guestName: 'Sam', guestEmail: 'sam@x.com' });
    expect(parsed.items[0].optionIds).toEqual([]);
    expect(parsed.guestName).toBe('Sam');
  });

  it('rejects an invalid guest email', () => {
    expect(placeOrderSchema.safeParse({ ...valid, guestEmail: 'nope' }).success).toBe(false);
  });
});

const validOnline = {
  slug: 'bella-vista',
  orderType: 'PICKUP' as const,
  customerName: 'Sam',
  customerPhone: '555-0100',
  items: [{ menuItemId: 1, quantity: 2 }],
};

describe('placeOnlineOrderSchema', () => {
  it('accepts a valid pickup order and defaults optionIds', () => {
    const parsed = placeOnlineOrderSchema.parse(validOnline);
    expect(parsed.items[0].optionIds).toEqual([]);
    expect(parsed.orderType).toBe('PICKUP');
  });

  it('requires a customer name and phone', () => {
    expect(placeOnlineOrderSchema.safeParse({ ...validOnline, customerName: '' }).success).toBe(false);
    expect(placeOnlineOrderSchema.safeParse({ ...validOnline, customerPhone: '' }).success).toBe(false);
  });

  it('requires a delivery address for delivery orders', () => {
    expect(
      placeOnlineOrderSchema.safeParse({ ...validOnline, orderType: 'DELIVERY' }).success,
    ).toBe(false);
    expect(
      placeOnlineOrderSchema.safeParse({
        ...validOnline,
        orderType: 'DELIVERY',
        deliveryAddress: '1 Main St',
      }).success,
    ).toBe(true);
  });

  it('does not require an address for pickup', () => {
    expect(placeOnlineOrderSchema.safeParse(validOnline).success).toBe(true);
  });

  it('rejects an unknown order type', () => {
    expect(placeOnlineOrderSchema.safeParse({ ...validOnline, orderType: 'DINE_IN' }).success).toBe(
      false,
    );
  });

  it('coerces requestedTime to a Date', () => {
    const parsed = placeOnlineOrderSchema.parse({
      ...validOnline,
      requestedTime: '2026-07-16T18:30:00Z',
    });
    expect(parsed.requestedTime).toBeInstanceOf(Date);
  });
});
