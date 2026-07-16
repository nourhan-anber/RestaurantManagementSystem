import { z } from 'zod';

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.').max(100),
  isHidden: z.boolean().default(false),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
