import { describe, expect, it } from 'vitest';
import { addLine, cartCount, cartTotal, decrementLine, removeLine, type CartLine } from './cart';

const risotto = { menuItemId: 1, name: 'Risotto', price: 24 };
const pizza = { menuItemId: 2, name: 'Pizza', price: 18 };

describe('cart', () => {
  it('adds a new line with quantity 1', () => {
    expect(addLine([], risotto)).toEqual([{ ...risotto, quantity: 1 }]);
  });

  it('increments the quantity of an existing line', () => {
    const lines = addLine(addLine([], risotto), risotto);
    expect(lines).toEqual([{ ...risotto, quantity: 2 }]);
  });

  it('decrements and drops a line at zero', () => {
    const lines: CartLine[] = [{ ...risotto, quantity: 2 }];
    expect(decrementLine(lines, 1)).toEqual([{ ...risotto, quantity: 1 }]);
    expect(decrementLine([{ ...risotto, quantity: 1 }], 1)).toEqual([]);
  });

  it('removes a line entirely', () => {
    const lines: CartLine[] = [{ ...risotto, quantity: 3 }, { ...pizza, quantity: 1 }];
    expect(removeLine(lines, 1)).toEqual([{ ...pizza, quantity: 1 }]);
  });

  it('computes count and total', () => {
    const lines: CartLine[] = [{ ...risotto, quantity: 2 }, { ...pizza, quantity: 1 }];
    expect(cartCount(lines)).toBe(3);
    expect(cartTotal(lines)).toBe(66);
  });
});
