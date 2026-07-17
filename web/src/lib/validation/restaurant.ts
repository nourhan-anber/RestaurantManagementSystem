import { z } from 'zod';
import { isStorefrontTemplate, isValidHexColor } from '@/lib/storefront';

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
  ordersPaused: z.boolean().optional(),
  // Tax config: taxRegion selects a preset (whose rate/label win); 'custom'/blank
  // uses taxRatePercent + taxLabel. Resolved server-side in updateRestaurantBranding.
  taxEnabled: z.boolean().optional(),
  taxRegion: z.string().trim().max(20).optional(),
  taxRatePercent: z.coerce
    .number()
    .min(0, 'Tax rate must be 0 or more.')
    .max(30, 'Tax rate looks too high.')
    .optional(),
  taxLabel: z.string().trim().max(40).optional(),
  // Storefront look.
  storefrontTemplate: z.string().trim().refine(isStorefrontTemplate, 'Pick a valid template.').optional(),
  themeColor: z.string().trim().refine(isValidHexColor, 'Enter a valid hex color.').optional(),
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

/** Loyalty-program settings. Points per dollar is a whole number; redemption value
 *  is dollars per point (e.g. 0.01 = 1¢). */
export const loyaltySchema = z.object({
  loyaltyEnabled: z.coerce.boolean(),
  pointsPerDollar: z.coerce.number().int().min(1).max(1000),
  redeemValuePerPoint: z.coerce.number().min(0).max(100),
});

export type LoyaltyInput = z.infer<typeof loyaltySchema>;
