import { describe, expect, it } from 'vitest';
import {
  addLine,
  buildLine,
  cartCount,
  cartTotal,
  decrementLine,
  lineSignature,
  removeLine,
  type CartLine,
} from './cart';

const risotto = { menuItemId: 1, name: 'Risotto', basePrice: 24 };
const large = { optionId: 12, groupId: 1, name: 'Large', priceDelta: 4 };
const cheese = { optionId: 21, groupId: 2, name: 'Cheese', priceDelta: 2 };

describe('lineSignature', () => {
  it('is order-independent for options', () => {
    expect(lineSignature(1, [12, 21])).toBe(lineSignature(1, [21, 12]));
  });
  it('distinguishes notes', () => {
    expect(lineSignature(1, [12])).not.toBe(lineSignature(1, [12], 'no onions'));
  });
});

describe('buildLine', () => {
  it('precomputes unit price from base + option deltas', () => {
    const line = buildLine({ ...risotto, options: [large, cheese] });
    expect(line.unitPrice).toBe(30);
    expect(line.quantity).toBe(1);
    // options stored sorted by optionId
    expect(line.options.map((o) => o.optionId)).toEqual([12, 21]);
  });
});

describe('addLine', () => {
  it('merges identical selections (quantity++)', () => {
    let lines = addLine([], { ...risotto, options: [large] });
    lines = addLine(lines, { ...risotto, options: [large] });
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);
  });

  it('keeps different option sets as distinct lines', () => {
    let lines = addLine([], { ...risotto, options: [large] });
    lines = addLine(lines, { ...risotto, options: [large, cheese] });
    expect(lines).toHaveLength(2);
  });

  it('keeps a noted line separate from a plain one', () => {
    let lines = addLine([], { ...risotto });
    lines = addLine(lines, { ...risotto, notes: 'no onions' });
    expect(lines).toHaveLength(2);
  });
});

describe('decrement / remove / totals', () => {
  it('decrements then drops at zero, keyed by lineId', () => {
    const lines = addLine(addLine([], { ...risotto }), { ...risotto });
    const id = lines[0].lineId;
    expect(decrementLine(lines, id)[0].quantity).toBe(1);
    expect(decrementLine(addLine([], { ...risotto }), id)).toEqual([]);
  });

  it('removes by lineId', () => {
    const lines = addLine([], { ...risotto });
    expect(removeLine(lines, lines[0].lineId)).toEqual([]);
  });

  it('counts and totals across lines', () => {
    const lines: CartLine[] = [
      buildLine({ ...risotto, options: [large] }), // 28
      { ...buildLine({ ...risotto }), quantity: 2 }, // 24 x2
    ];
    expect(cartCount(lines)).toBe(3);
    expect(cartTotal(lines)).toBe(28 + 48);
  });
});
