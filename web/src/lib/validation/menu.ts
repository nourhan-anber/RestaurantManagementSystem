import { z } from 'zod';
import { DietaryTag } from '@/generated/prisma/enums';

export const menuItemInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200),
  categoryId: z.coerce.number().int().positive('Choose a category.'),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().positive('Price must be greater than 0.').max(1_000_000),
  imageUrl: z.string().trim().url('Enter a valid image URL.').optional(),
  isAvailable: z.boolean(),
  dietaryTags: z.array(z.nativeEnum(DietaryTag)).default([]),
  spiceLevel: z.coerce.number().int().min(0).max(3).default(0),
});

export type MenuItemInput = z.infer<typeof menuItemInputSchema>;
