import { create } from 'zustand';
import { addLine, decrementLine, removeLine, type CartAddable, type CartLine } from '@/lib/cart';

interface CartState {
  lines: CartLine[];
  add: (item: CartAddable) => void;
  decrement: (lineId: string) => void;
  remove: (lineId: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>((set) => ({
  lines: [],
  add: (item) => set((s) => ({ lines: addLine(s.lines, item) })),
  decrement: (lineId) => set((s) => ({ lines: decrementLine(s.lines, lineId) })),
  remove: (lineId) => set((s) => ({ lines: removeLine(s.lines, lineId) })),
  clear: () => set({ lines: [] }),
}));
