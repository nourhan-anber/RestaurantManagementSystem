import { create } from 'zustand';
import { addLine, decrementLine, removeLine, type CartAddable, type CartLine } from '@/lib/cart';

interface CartState {
  lines: CartLine[];
  add: (item: CartAddable) => void;
  decrement: (menuItemId: number) => void;
  remove: (menuItemId: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>((set) => ({
  lines: [],
  add: (item) => set((s) => ({ lines: addLine(s.lines, item) })),
  decrement: (id) => set((s) => ({ lines: decrementLine(s.lines, id) })),
  remove: (id) => set((s) => ({ lines: removeLine(s.lines, id) })),
  clear: () => set({ lines: [] }),
}));
