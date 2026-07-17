import { z } from 'zod';

const optionalPositiveInt = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().int().positive().max(1_000_000).optional(),
);

const optionalDate = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.date().optional(),
);

/** Create/edit a promo code. Percent discounts are capped at 100%. */
export const createPromoSchema = z
  .object({
    code: z.string().trim().min(1).max(60),
    kind: z.enum(['PERCENT', 'AMOUNT']),
    value: z.coerce.number().positive().max(100_000),
    maxUses: optionalPositiveInt,
    expiresAt: optionalDate,
  })
  .refine((d) => d.kind !== 'PERCENT' || d.value <= 100, {
    message: 'A percentage discount can’t exceed 100%.',
    path: ['value'],
  });

export type CreatePromoInput = z.infer<typeof createPromoSchema>;
