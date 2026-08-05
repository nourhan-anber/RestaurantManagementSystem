/** Pure assembly of Stripe Checkout line items for a storefront order. Kept out of
 *  the Stripe wrapper (server/checkout.ts) so the branch logic is unit-tested. */

export interface OrderLineItemsInput {
  restaurantName: string;
  orderId: number;
  currency: string;
  subtotalCents: number;
  taxCents?: number;
  taxLabel?: string;
  deliveryFeeCents?: number;
  tipCents?: number;
}

export interface StripeLineItem {
  price_data: { currency: string; product_data: { name: string }; unit_amount: number };
  quantity: number;
}

function line(currency: string, name: string, unitAmount: number): StripeLineItem {
  return { price_data: { currency, product_data: { name }, unit_amount: unitAmount }, quantity: 1 };
}

/**
 * The line items charged for an order: always the (discounted) food subtotal, plus a
 * tax line, a delivery line, and a tip line when each is present and positive. Order
 * is stable (subtotal → tax → delivery → tip) so receipts read consistently.
 */
export function orderCheckoutLineItems(input: OrderLineItemsInput): StripeLineItem[] {
  const items: StripeLineItem[] = [
    line(input.currency, `${input.restaurantName} order #${input.orderId}`, input.subtotalCents),
  ];
  if (input.taxCents && input.taxCents > 0) {
    items.push(line(input.currency, input.taxLabel || 'Tax', input.taxCents));
  }
  if (input.deliveryFeeCents && input.deliveryFeeCents > 0) {
    items.push(line(input.currency, 'Delivery', input.deliveryFeeCents));
  }
  if (input.tipCents && input.tipCents > 0) {
    items.push(line(input.currency, 'Tip', input.tipCents));
  }
  return items;
}
