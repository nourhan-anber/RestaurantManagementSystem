import { z } from 'zod';

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(2, 'Restaurant name is required.').max(120),
  ownerName: z.string().trim().min(1, "Owner's name is required.").max(120),
  ownerEmail: z.string().trim().toLowerCase().email('Enter a valid owner email.'),
  ownerPassword: z.string().min(8, 'Temporary password must be at least 8 characters.'),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
