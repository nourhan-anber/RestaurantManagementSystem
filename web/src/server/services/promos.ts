import type { PrismaClient } from '@/generated/prisma/client';
import type { PromoKind } from '@/generated/prisma/enums';
import { applyDiscount, validatePromo } from '@/lib/discount';

/** Normalize codes to a canonical uppercase form so lookups are case-insensitive. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function listPromos(db: PrismaClient, restaurantId: number) {
  return db.promoCode.findMany({ where: { restaurantId }, orderBy: { createdAt: 'desc' } });
}

export interface PromoInput {
  code: string;
  kind: PromoKind;
  value: number;
  maxUses?: number | null;
  expiresAt?: Date | null;
}

export type CreatePromoResult = { ok: true; id: number } | { ok: false; reason: 'duplicate' };

/** Create a promo code (unique per restaurant). Codes are stored uppercased. */
export async function createPromo(
  db: PrismaClient,
  restaurantId: number,
  input: PromoInput,
): Promise<CreatePromoResult> {
  const code = normalizeCode(input.code);
  const existing = await db.promoCode.findUnique({ where: { restaurantId_code: { restaurantId, code } } });
  if (existing) return { ok: false, reason: 'duplicate' };
  const created = await db.promoCode.create({
    data: {
      restaurantId,
      code,
      kind: input.kind,
      value: input.value,
      maxUses: input.maxUses ?? null,
      expiresAt: input.expiresAt ?? null,
    },
  });
  return { ok: true, id: created.id };
}

/** Toggle a promo's active flag (tenant-scoped). */
export function setPromoActive(db: PrismaClient, restaurantId: number, id: number, active: boolean) {
  return db.promoCode.updateMany({ where: { id, restaurantId }, data: { active } });
}

/** Delete a promo (tenant-scoped). */
export function deletePromo(db: PrismaClient, restaurantId: number, id: number) {
  return db.promoCode.deleteMany({ where: { id, restaurantId } });
}

export type PromoPreview =
  | { ok: true; code: string; kind: PromoKind; value: number; discount: number }
  | { ok: false; reason: 'not_found' | 'inactive' | 'expired' | 'exhausted' | 'no_effect' };

/**
 * Validate a code against a subtotal and return the discount it would apply, without
 * redeeming it. Used by the storefront preview endpoint. `now` is injected for tests.
 */
export async function previewPromo(
  db: PrismaClient,
  restaurantId: number,
  code: string,
  subtotal: number,
  now: Date,
): Promise<PromoPreview> {
  const promo = await db.promoCode.findUnique({
    where: { restaurantId_code: { restaurantId, code: normalizeCode(code) } },
  });
  if (!promo) return { ok: false, reason: 'not_found' };
  const check = validatePromo(promo, now);
  if (!check.ok) return { ok: false, reason: check.reason };
  const discount = applyDiscount(subtotal, { kind: promo.kind, value: Number(promo.value) });
  if (discount <= 0) return { ok: false, reason: 'no_effect' };
  return { ok: true, code: promo.code, kind: promo.kind, value: Number(promo.value), discount };
}
