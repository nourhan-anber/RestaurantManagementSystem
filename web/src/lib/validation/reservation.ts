import { z } from 'zod';
import { isValidPhone } from '@/lib/phone';

const optionalPhone = z
  .string()
  .trim()
  .max(40)
  .refine((v) => v === '' || isValidPhone(v), 'Enter a valid phone number.')
  .optional();

const partySize = z.coerce.number().int().min(1).max(100);

/** Book a reservation (name, party size, and a datetime). */
export const createReservationSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(120),
  phone: optionalPhone,
  partySize,
  at: z.coerce.date(),
  notes: z.string().trim().max(300).optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

/** Add a walk-in to the waitlist (with an optional quoted wait). */
export const waitlistSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(120),
  phone: optionalPhone,
  partySize,
  quotedMinutes: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().int().min(0).max(600).optional(),
  ),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
