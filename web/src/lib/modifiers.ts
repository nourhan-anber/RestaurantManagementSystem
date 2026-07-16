export interface OptionSpec {
  id: number;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
}
export interface GroupSpec {
  id: number;
  name: string;
  minSelect: number;
  maxSelect: number | null;
  options: OptionSpec[];
}
export interface ItemSpec {
  id: number;
  basePrice: number;
  groups: GroupSpec[];
}

export interface OptionSnapshot {
  optionId: number;
  groupName: string;
  optionName: string;
  priceDelta: number;
}
export interface PricedLine {
  unitPrice: number;
  snapshots: OptionSnapshot[];
}

export type PriceFailure =
  | 'duplicate'
  | 'unknown_option'
  | 'unavailable_option'
  | 'min_select'
  | 'max_select'
  | 'negative_price';

export type PriceResult = { ok: true; line: PricedLine } | { ok: false; reason: PriceFailure };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Validate a customer's selected options against an item's groups and compute the
 * effective unit price from DB values only (the client never sends prices).
 * Returns typed snapshots to persist so future menu edits can't rewrite history.
 */
export function priceLine(item: ItemSpec, selectedOptionIds: number[]): PriceResult {
  if (new Set(selectedOptionIds).size !== selectedOptionIds.length) {
    return { ok: false, reason: 'duplicate' };
  }

  // Index every option that belongs to THIS item's groups.
  const byOption = new Map<number, { group: GroupSpec; option: OptionSpec }>();
  for (const group of item.groups) {
    for (const option of group.options) {
      byOption.set(option.id, { group, option });
    }
  }

  // Every selected id must belong to this item (foreign / wrong-item ids fail here).
  for (const id of selectedOptionIds) {
    const hit = byOption.get(id);
    if (!hit) return { ok: false, reason: 'unknown_option' };
    if (!hit.option.isAvailable) return { ok: false, reason: 'unavailable_option' };
  }

  // Per-group min/max.
  const selected = new Set(selectedOptionIds);
  for (const group of item.groups) {
    const count = group.options.filter((o) => selected.has(o.id)).length;
    if (count < group.minSelect) return { ok: false, reason: 'min_select' };
    if (group.maxSelect != null && count > group.maxSelect) return { ok: false, reason: 'max_select' };
  }

  // Price + snapshots in group -> option order.
  const snapshots: OptionSnapshot[] = [];
  let delta = 0;
  for (const group of item.groups) {
    for (const option of group.options) {
      if (!selected.has(option.id)) continue;
      delta += option.priceDelta;
      snapshots.push({
        optionId: option.id,
        groupName: group.name,
        optionName: option.name,
        priceDelta: option.priceDelta,
      });
    }
  }

  const unitPrice = round2(item.basePrice + delta);
  if (unitPrice < 0) return { ok: false, reason: 'negative_price' };
  return { ok: true, line: { unitPrice, snapshots } };
}
