import { describe, expect, it } from 'vitest';
import { priceLine, type ItemSpec } from './modifiers';

// Burger $10: Size (choose 1 required) S+0 / L+4 ; Add-ons (0..2) cheese+2 / bacon+3 (bacon out)
const item: ItemSpec = {
  id: 1,
  basePrice: 10,
  groups: [
    {
      id: 1,
      name: 'Size',
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: 11, name: 'Small', priceDelta: 0, isAvailable: true },
        { id: 12, name: 'Large', priceDelta: 4, isAvailable: true },
      ],
    },
    {
      id: 2,
      name: 'Add-ons',
      minSelect: 0,
      maxSelect: 2,
      options: [
        { id: 21, name: 'Cheese', priceDelta: 2, isAvailable: true },
        { id: 22, name: 'Bacon', priceDelta: 3, isAvailable: false },
      ],
    },
  ],
};

describe('priceLine', () => {
  it('prices a valid selection and snapshots the options', () => {
    const res = priceLine(item, [12, 21]);
    expect(res).toEqual({
      ok: true,
      line: {
        unitPrice: 16,
        snapshots: [
          { optionId: 12, groupName: 'Size', optionName: 'Large', priceDelta: 4 },
          { optionId: 21, groupName: 'Add-ons', optionName: 'Cheese', priceDelta: 2 },
        ],
      },
    });
  });

  it('computes base price when only the required group is chosen', () => {
    const res = priceLine(item, [11]);
    expect(res.ok && res.line.unitPrice).toBe(10);
  });

  it('rejects duplicate ids', () => {
    expect(priceLine(item, [11, 11])).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('rejects a foreign / unknown option id', () => {
    expect(priceLine(item, [999])).toEqual({ ok: false, reason: 'unknown_option' });
  });

  it('rejects an unavailable option', () => {
    expect(priceLine(item, [11, 22])).toEqual({ ok: false, reason: 'unavailable_option' });
  });

  it('enforces the required minimum', () => {
    expect(priceLine(item, [])).toEqual({ ok: false, reason: 'min_select' });
  });

  it('enforces the maximum for single-select', () => {
    expect(priceLine(item, [11, 12])).toEqual({ ok: false, reason: 'max_select' });
  });

  it('rejects a negative resulting price', () => {
    const discounted: ItemSpec = {
      id: 2,
      basePrice: 1,
      groups: [
        {
          id: 9,
          name: 'Discount',
          minSelect: 1,
          maxSelect: 1,
          options: [{ id: 91, name: 'Comp', priceDelta: -5, isAvailable: true }],
        },
      ],
    };
    expect(priceLine(discounted, [91])).toEqual({ ok: false, reason: 'negative_price' });
  });
});
