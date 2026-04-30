import { describe, it, expect, beforeEach } from 'vitest';
import useCartStore from '../store/cartStore';

// Helper: reset store to empty state between tests
const resetStore = () => useCartStore.setState({ items: [] });

describe('cartStore', () => {
  beforeEach(() => resetStore());

  const item1 = { id: 1, name: 'Risotto', price: 24.0 };
  const item2 = { id: 2, name: 'Burger',  price: 28.0 };

  // ── addItem ────────────────────────────────────────────────
  it('adds a new item with quantity 1', () => {
    useCartStore.getState().addItem(item1);
    expect(useCartStore.getState().items).toEqual([{ ...item1, quantity: 1 }]);
  });

  it('increments quantity when adding an existing item', () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('adds multiple distinct items', () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item2);
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('increments only the matching item when multiple exist (covers map pass-through)', () => {
    useCartStore.getState().addItem(item1); // qty 1
    useCartStore.getState().addItem(item2); // qty 1
    useCartStore.getState().addItem(item1); // increments item1 to qty 2; item2 untouched
    const state = useCartStore.getState().items;
    expect(state.find((i) => i.id === 1).quantity).toBe(2);
    expect(state.find((i) => i.id === 2).quantity).toBe(1); // pass-through branch hit
  });

  // ── removeItem ─────────────────────────────────────────────
  it('removes an item by id', () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item2);
    useCartStore.getState().removeItem(1);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].id).toBe(2);
  });

  // ── decrementItem ──────────────────────────────────────────
  it('decrements quantity by 1', () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item1); // qty = 2
    useCartStore.getState().decrementItem(1);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('decrements only the matching item when multiple exist (covers map pass-through)', () => {
    useCartStore.getState().addItem(item1); // qty 1
    useCartStore.getState().addItem(item1); // qty 2
    useCartStore.getState().addItem(item2); // qty 1
    useCartStore.getState().decrementItem(1); // item1 → qty 1, item2 untouched
    const state = useCartStore.getState().items;
    expect(state.find((i) => i.id === 1).quantity).toBe(1);
    expect(state.find((i) => i.id === 2).quantity).toBe(1);
  });

  it('removes the item when decrement hits 0', () => {
    useCartStore.getState().addItem(item1); // qty = 1
    useCartStore.getState().decrementItem(1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('does nothing when decrementing an item not in the cart', () => {
    useCartStore.getState().decrementItem(99);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  // ── clearCart ──────────────────────────────────────────────
  it('clears all items', () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item2);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  // ── totalItems ─────────────────────────────────────────────
  it('returns total item count', () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item1); // qty 2
    useCartStore.getState().addItem(item2); // qty 1
    expect(useCartStore.getState().totalItems()).toBe(3);
  });

  it('returns 0 total items when cart is empty', () => {
    expect(useCartStore.getState().totalItems()).toBe(0);
  });

  // ── totalPrice ─────────────────────────────────────────────
  it('returns the correct total price', () => {
    useCartStore.getState().addItem(item1); // 24
    useCartStore.getState().addItem(item1); // 24 × 2 = 48
    useCartStore.getState().addItem(item2); // 28
    expect(useCartStore.getState().totalPrice()).toBeCloseTo(76);
  });

  it('returns 0 total price when cart is empty', () => {
    expect(useCartStore.getState().totalPrice()).toBe(0);
  });
});
