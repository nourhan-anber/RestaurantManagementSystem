import { computeTax } from '@/lib/tax';

/** Pure discount math — promo/comp amounts, promo validity, and discounted order totals. */

export type DiscountKind = 'PERCENT' | 'AMOUNT';

export interface DiscountSpec {
  kind: DiscountKind;
  value: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The discount amount for a subtotal, clamped to [0, subtotal]. */
export function applyDiscount(subtotal: number, spec: DiscountSpec): number {
  if (!(subtotal > 0)) return 0;
  const raw = spec.kind === 'PERCENT' ? (subtotal * spec.value) / 100 : spec.value;
  return round2(Math.min(Math.max(raw, 0), subtotal));
}

export interface PromoLike {
  active: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
}

export type PromoValidation = { ok: true } | { ok: false; reason: 'inactive' | 'expired' | 'exhausted' };

/** Is a promo redeemable right now? (Active, unexpired, and under its use cap.) */
export function validatePromo(promo: PromoLike, now: Date): PromoValidation {
  if (!promo.active) return { ok: false, reason: 'inactive' };
  if (promo.expiresAt && promo.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: 'expired' };
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return { ok: false, reason: 'exhausted' };
  return { ok: true };
}

export interface OrderTotals {
  subtotal: number; // pre-discount food subtotal
  discount: number; // clamped to [0, subtotal]
  taxableBase: number; // subtotal − discount
  taxAmount: number; // tax on the discounted base
  total: number; // taxableBase + taxAmount
}

/**
 * The one place the discount → tax ordering is encoded: a discount reduces the
 * pre-tax subtotal, then tax is charged on the discounted base. `subtotal` stays
 * the original pre-discount figure so order history remains legible.
 */
export function orderTotals(
  subtotal: number,
  discount: number,
  ratePercent: number,
  taxEnabled: boolean,
): OrderTotals {
  const sub = round2(Math.max(subtotal, 0));
  const d = round2(Math.min(Math.max(discount, 0), sub));
  const taxableBase = round2(sub - d);
  const tax = computeTax(taxableBase, ratePercent, taxEnabled);
  return { subtotal: sub, discount: d, taxableBase, taxAmount: tax.taxAmount, total: tax.total };
}
