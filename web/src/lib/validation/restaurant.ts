import { z } from 'zod';

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(2, 'Restaurant name is required.').max(120),
  ownerName: z.string().trim().min(1, "Owner's name is required.").max(120),
  ownerEmail: z.string().trim().toLowerCase().email('Enter a valid owner email.'),
  ownerPassword: z.string().min(8, 'Temporary password must be at least 8 characters.'),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;

export const brandingSchema = z.object({
  name: z.string().trim().min(2, 'Restaurant name is required.').max(120),
  description: z.string().trim().max(1000).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(300).optional(),
  timezone: z.string().trim().min(1).max(64),
  logoUrl: z.string().trim().url('Enter a valid logo URL.').optional(),
  onlineOrderingEnabled: z.boolean(),
});

export type BrandingInput = z.infer<typeof brandingSchema>;

export const dayHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isClosed: z.boolean(),
  opensMinutes: z.number().int().min(0).max(1440),
  closesMinutes: z.number().int().min(0).max(1440),
});

export const hoursSchema = z.array(dayHoursSchema).length(7, 'Provide all seven days.');

export type HoursInput = z.infer<typeof hoursSchema>;
