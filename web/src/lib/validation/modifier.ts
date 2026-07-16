import { z } from 'zod';

export const modifierGroupInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(100),
    minSelect: z.coerce.number().int().min(0).max(20),
    // null = unlimited (multi-select). The action converts an empty form field to null.
    maxSelect: z.number().int().min(1, 'Max must be at least 1.').max(20).nullable(),
  })
  .refine((g) => g.maxSelect === null || g.maxSelect >= g.minSelect, {
    message: 'Max selections must be at least the minimum.',
    path: ['maxSelect'],
  });

export const modifierOptionInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(100),
  priceDelta: z.coerce.number().min(-100_000).max(100_000),
  isAvailable: z.boolean(),
});

export type ModifierGroupInput = z.infer<typeof modifierGroupInputSchema>;
export type ModifierOptionInput = z.infer<typeof modifierOptionInputSchema>;
