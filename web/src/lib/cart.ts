export interface CartLine {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
}

export type CartAddable = Omit<CartLine, 'quantity'>;

export function addLine(lines: CartLine[], item: CartAddable): CartLine[] {
  const existing = lines.find((l) => l.menuItemId === item.menuItemId);
  if (existing) {
    return lines.map((l) =>
      l.menuItemId === item.menuItemId ? { ...l, quantity: l.quantity + 1 } : l,
    );
  }
  return [...lines, { ...item, quantity: 1 }];
}

export function decrementLine(lines: CartLine[], menuItemId: number): CartLine[] {
  return lines.flatMap((l) => {
    if (l.menuItemId !== menuItemId) return [l];
    return l.quantity <= 1 ? [] : [{ ...l, quantity: l.quantity - 1 }];
  });
}

export function removeLine(lines: CartLine[], menuItemId: number): CartLine[] {
  return lines.filter((l) => l.menuItemId !== menuItemId);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
}
