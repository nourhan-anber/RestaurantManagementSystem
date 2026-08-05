export interface CartSelectedOption {
  optionId: number;
  groupId: number;
  name: string;
  priceDelta: number;
}

export interface CartLine {
  lineId: string;
  menuItemId: number;
  name: string;
  basePrice: number;
  options: CartSelectedOption[];
  notes?: string;
  unitPrice: number;
  quantity: number;
}

export interface CartAddable {
  menuItemId: number;
  name: string;
  basePrice: number;
  options?: CartSelectedOption[];
  notes?: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Deterministic merge/React key: same item + same option set + same note => same id. */
export function lineSignature(menuItemId: number, optionIds: number[], notes?: string): string {
  const opts = [...optionIds].sort((a, b) => a - b).join(',');
  const trimmed = notes?.trim();
  return `${menuItemId}:${opts}${trimmed ? `#${trimmed}` : ''}`;
}

export function buildLine(item: CartAddable): CartLine {
  const options = [...(item.options ?? [])].sort((a, b) => a.optionId - b.optionId);
  const notes = item.notes?.trim() || undefined;
  const unitPrice = round2(item.basePrice + options.reduce((sum, o) => sum + o.priceDelta, 0));
  return {
    lineId: lineSignature(
      item.menuItemId,
      options.map((o) => o.optionId),
      notes,
    ),
    menuItemId: item.menuItemId,
    name: item.name,
    basePrice: item.basePrice,
    options,
    notes,
    unitPrice,
    quantity: 1,
  };
}

export function addLine(lines: CartLine[], item: CartAddable): CartLine[] {
  const line = buildLine(item);
  const existing = lines.find((l) => l.lineId === line.lineId);
  if (existing) {
    return lines.map((l) => (l.lineId === line.lineId ? { ...l, quantity: l.quantity + 1 } : l));
  }
  return [...lines, line];
}

export function decrementLine(lines: CartLine[], lineId: string): CartLine[] {
  return lines.flatMap((l) => {
    if (l.lineId !== lineId) return [l];
    return l.quantity <= 1 ? [] : [{ ...l, quantity: l.quantity - 1 }];
  });
}

export function removeLine(lines: CartLine[], lineId: string): CartLine[] {
  return lines.filter((l) => l.lineId !== lineId);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function cartTotal(lines: CartLine[]): number {
  return round2(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
}
