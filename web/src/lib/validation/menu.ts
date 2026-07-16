import { z } from 'zod';

export const menuItemInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200),
  category: z.string().trim().min(1, 'Category is required.').max(100),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().positive('Price must be greater than 0.').max(1_000_000),
  imageUrl: z.string().trim().url('Enter a valid image URL.').optional(),
  isAvailable: z.boolean(),
});

export type MenuItemInput = z.infer<typeof menuItemInputSchema>;
