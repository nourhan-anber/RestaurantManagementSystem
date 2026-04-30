import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [], // { id, name, price (number), quantity }

  addItem: (item) => {
    const existing = get().items.find((i) => i.id === item.id);
    if (existing) {
      set((state) => ({
        items: state.items.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      }));
    } else {
      set((state) => ({ items: [...state.items, { ...item, quantity: 1 }] }));
    }
  },

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  decrementItem: (id) => {
    const existing = get().items.find((i) => i.id === id);
    if (!existing) return;
    if (existing.quantity === 1) {
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
    } else {
      set((state) => ({
        items: state.items.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity - 1 } : i
        ),
      }));
    }
  },

  clearCart: () => set({ items: [] }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  totalPrice: () =>
    get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));

export default useCartStore;
