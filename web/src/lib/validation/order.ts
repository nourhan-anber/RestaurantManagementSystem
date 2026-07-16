import { z } from 'zod';

export const placeOrderSchema = z.object({
  slug: z.string().min(1),
  tableNumber: z.coerce.number().int().positive(),
  token: z.string().min(1),
  notes: z.string().max(500).optional(),
  guestName: z.string().trim().min(1).max(120).optional(),
  guestEmail: z.string().trim().email().max(200).optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.number().int().positive(),
        quantity: z.number().int().positive().max(99),
        notes: z.string().max(200).optional(),
        optionIds: z.array(z.number().int().positive()).max(50).default([]),
      }),
    )
    .min(1, 'Add at least one item.'),
});

export type PlaceOrderRequest = z.infer<typeof placeOrderSchema>;
