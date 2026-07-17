import { z } from 'zod';

export const settleBillSchema = z
  .object({
    method: z.enum(['CASH', 'CARD', 'OTHER']),
    transactionId: z.string().trim().max(120).optional(),
  })
  .refine((d) => d.method !== 'CARD' || Boolean(d.transactionId), {
    message: 'A card payment needs a transaction id.',
    path: ['transactionId'],
  });

export type SettleBillInput = z.infer<typeof settleBillSchema>;

/** Refund form: a blank amount means "refund the full remaining balance". */
export const refundSchema = z.object({
  amount: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().positive().max(1_000_000).optional(),
  ),
  reason: z.string().trim().max(200).optional(),
});

export type RefundInput = z.infer<typeof refundSchema>;
