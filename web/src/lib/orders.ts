import type { OrderStatus } from '@/generated/prisma/enums';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERED',
  'CANCELLED',
];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

/** Orders visible on the kitchen display. */
export const ACTIVE_KITCHEN_STATUSES: readonly OrderStatus[] = ['PENDING', 'PREPARING', 'READY'];

/** Terminal statuses that free a table. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = ['DELIVERED', 'CANCELLED'];

const KITCHEN_FLOW: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'PREPARING',
  PREPARING: 'READY',
  READY: 'DELIVERED',
};

/** The next status when a cook advances a ticket, or null if already terminal. */
export function nextKitchenStatus(current: OrderStatus): OrderStatus | null {
  return KITCHEN_FLOW[current] ?? null;
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
