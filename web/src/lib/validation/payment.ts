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
