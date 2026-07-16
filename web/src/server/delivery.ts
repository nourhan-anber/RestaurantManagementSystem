import type { DeliveryStatus } from '@/generated/prisma/enums';
import { mockFee } from '@/lib/delivery';

export interface DeliveryQuote {
  quoteId: string;
  fee: number; // dollars
  currency: string;
  etaMinutes: number;
}

export interface DeliveryDispatch {
  externalId: string;
  trackingUrl: string;
  status: DeliveryStatus;
}

export interface DeliveryProvider {
  readonly name: string;
  quote(input: { pickup: string; dropoff: string }): Promise<DeliveryQuote>;
  createDelivery(input: {
    orderId: number;
    pickup: string;
    dropoff: string;
    customerName: string;
    customerPhone: string;
    quoteId?: string;
  }): Promise<DeliveryDispatch>;
  /** Verify a provider webhook. The mock accepts everything (dev/test only). */
  verifyWebhook(rawBody: string, signature: string | null): boolean;
}

/** Stable non-negative hash so mock ids are deterministic per input. */
function slug(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) h = ((h * 33) ^ value.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * Deterministic in-process courier. No network, no credentials — used for local
 * dev, tests, and any environment where UBER_DIRECT_* isn't configured, so the
 * full pickup/delivery flow is always exercisable end to end.
 */
const mockProvider: DeliveryProvider = {
  name: 'mock',
  async quote({ dropoff }) {
    return { quoteId: `mock_q_${slug(dropoff)}`, fee: mockFee(dropoff), currency: 'usd', etaMinutes: 35 };
  },
  async createDelivery({ orderId, dropoff }) {
    const externalId = `mock_del_${orderId}_${slug(dropoff)}`;
    return {
      externalId,
      trackingUrl: `https://track.mock.local/${externalId}`,
      status: 'REQUESTED',
    };
  },
  verifyWebhook() {
    return true;
  },
};

/** True when real Uber Direct credentials are present (the P4 provider path). */
export function isUberDirectConfigured(): boolean {
  return Boolean(
    process.env.UBER_DIRECT_CUSTOMER_ID &&
      process.env.UBER_DIRECT_CLIENT_ID &&
      process.env.UBER_DIRECT_CLIENT_SECRET,
  );
}

/**
 * Unlike getStripe/getStorageProvider (which return null when unconfigured), this
 * ALWAYS returns a provider: the mock courier when Uber Direct isn't configured.
 * The real Uber Direct provider is wired in behind isUberDirectConfigured() (P4).
 */
export function getDeliveryProvider(): DeliveryProvider {
  return mockProvider;
}
