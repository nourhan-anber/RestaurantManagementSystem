import { z } from 'zod';
import { isValidPhone } from '@/lib/phone';

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

const orderLineSchema = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z.number().int().positive().max(99),
  notes: z.string().max(200).optional(),
  optionIds: z.array(z.number().int().positive()).max(50).default([]),
});

/**
 * Public storefront order (pickup or delivery). No table, no HMAC token — the
 * endpoint is gated by online-ordering-enabled + open-hours instead. Delivery
 * requires a dropoff address; prices are always recomputed server-side.
 */
export const placeOnlineOrderSchema = z
  .object({
    slug: z.string().min(1),
    orderType: z.enum(['PICKUP', 'DELIVERY']),
    customerName: z.string().trim().min(1).max(120),
    customerPhone: z.string().trim().min(5).max(40).refine(isValidPhone, 'Enter a valid phone number.'),
    guestEmail: z.string().trim().email().max(200).optional(),
    notes: z.string().max(500).optional(),
    deliveryAddress: z.string().trim().min(1).max(300).optional(),
    deliveryNotes: z.string().max(300).optional(),
    requestedTime: z.coerce.date().optional(),
    quoteId: z.string().max(200).optional(),
    payOnline: z.boolean().optional(),
    tip: z.coerce.number().min(0).max(100_000).optional(),
    promoCode: z.string().trim().min(1).max(60).optional(),
    items: z.array(orderLineSchema).min(1, 'Add at least one item.'),
  })
  .refine((v) => v.orderType !== 'DELIVERY' || Boolean(v.deliveryAddress), {
    message: 'Delivery orders need a delivery address.',
    path: ['deliveryAddress'],
  });

export type PlaceOnlineOrderRequest = z.infer<typeof placeOnlineOrderSchema>;
