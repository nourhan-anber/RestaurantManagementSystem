import { z } from 'zod';

export const tableInputSchema = z.object({
  number: z.coerce.number().int('Whole numbers only.').positive('Table number must be positive.'),
  capacity: z.coerce.number().int().positive().max(100),
  isActive: z.boolean(),
});

export type TableInput = z.infer<typeof tableInputSchema>;
