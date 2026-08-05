import { describe, expect, it } from 'vitest';
import { orderCheckoutLineItems } from './checkout';

const base = { restaurantName: 'Bella', orderId: 7, currency: 'usd', subtotalCents: 2000 };

describe('orderCheckoutLineItems', () => {
  it('always includes the food subtotal line, named for the order', () => {
    const items = orderCheckoutLineItems(base);
    expect(items).toHaveLength(1);
    expect(items[0].price_data.product_data.name).toBe('Bella order #7');
    expect(items[0].price_data.unit_amount).toBe(2000);
    expect(items[0].price_data.currency).toBe('usd');
    expect(items[0].quantity).toBe(1);
  });

  it('adds tax, delivery, and tip lines when each is present and positive, in order', () => {
    const items = orderCheckoutLineItems({
      ...base,
      taxCents: 260,
      taxLabel: 'HST',
      deliveryFeeCents: 500,
      tipCents: 300,
    });
    expect(items.map((i) => [i.price_data.product_data.name, i.price_data.unit_amount])).toEqual([
      ['Bella order #7', 2000],
      ['HST', 260],
      ['Delivery', 500],
      ['Tip', 300],
    ]);
  });

  it('falls back to a "Tax" label when none is provided', () => {
    const items = orderCheckoutLineItems({ ...base, taxCents: 260 });
    expect(items[1].price_data.product_data.name).toBe('Tax');
  });

  it('omits zero / undefined / missing add-on lines', () => {
    expect(orderCheckoutLineItems({ ...base, taxCents: 0, deliveryFeeCents: 0, tipCents: 0 })).toHaveLength(1);
    expect(orderCheckoutLineItems({ ...base, taxCents: undefined })).toHaveLength(1);
    // Only a tip present → subtotal + tip, no tax/delivery lines.
    const tipOnly = orderCheckoutLineItems({ ...base, tipCents: 300 });
    expect(tipOnly.map((i) => i.price_data.product_data.name)).toEqual(['Bella order #7', 'Tip']);
  });
});
