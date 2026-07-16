import { createHmac, timingSafeEqual } from 'node:crypto';
import type { DeliveryStatus } from '@/generated/prisma/enums';
import { mapUberStatus, mockFee } from '@/lib/delivery';

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

export interface CreateDeliveryInput {
  orderId: number;
  pickup: string;
  dropoff: string;
  customerName: string;
  customerPhone: string;
  pickupName?: string;
  pickupPhone?: string;
  quoteId?: string;
}

export interface DeliveryProvider {
  readonly name: string;
  quote(input: { pickup: string; dropoff: string }): Promise<DeliveryQuote>;
  createDelivery(input: CreateDeliveryInput): Promise<DeliveryDispatch>;
  /** Verify a provider webhook signature over the raw request body. */
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

// ─────────────────────── Uber Direct (real) provider ───────────────────────

const UBER_API = 'https://api.uber.com/v1';
const UBER_TOKEN_URL = 'https://login.uber.com/oauth/v2/token';

let tokenCache: { token: string; expiresAt: number } | null = null;

async function uberAccessToken(clientId: string, clientSecret: string): Promise<string> {
  // Reuse the cached token until a minute before it expires.
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;

  const res = await fetch(UBER_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'eats.deliveries',
    }),
  });
  if (!res.ok) throw new Error(`Uber auth failed (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return tokenCache.token;
}

interface UberConfig {
  customerId: string;
  clientId: string;
  clientSecret: string;
  signingKey: string;
}

function uberProvider(cfg: UberConfig): DeliveryProvider {
  async function authedFetch(path: string, body: unknown) {
    const token = await uberAccessToken(cfg.clientId, cfg.clientSecret);
    const res = await fetch(`${UBER_API}/customers/${cfg.customerId}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Uber ${path} failed (${res.status})`);
    return res.json();
  }

  return {
    name: 'uber_direct',
    async quote({ pickup, dropoff }) {
      const data = (await authedFetch('/delivery_quotes', {
        pickup_address: pickup,
        dropoff_address: dropoff,
      })) as { id: string; fee: number; currency: string; dropoff_eta?: number; duration?: number };
      return {
        quoteId: data.id,
        fee: (data.fee ?? 0) / 100, // Uber returns cents
        currency: (data.currency ?? 'usd').toLowerCase(),
        etaMinutes: data.dropoff_eta ?? data.duration ?? 0,
      };
    },
    async createDelivery(input) {
      const data = (await authedFetch('/deliveries', {
        quote_id: input.quoteId,
        pickup_address: input.pickup,
        pickup_name: input.pickupName ?? 'Restaurant',
        pickup_phone_number: input.pickupPhone ?? '',
        dropoff_address: input.dropoff,
        dropoff_name: input.customerName,
        dropoff_phone_number: input.customerPhone,
        manifest_items: [
          { name: `Order #${input.orderId}`, quantity: 1, size: 'small' },
        ],
        external_id: String(input.orderId),
      })) as { id: string; tracking_url?: string; status: string };
      return {
        externalId: data.id,
        trackingUrl: data.tracking_url ?? '',
        status: mapUberStatus(data.status) ?? 'REQUESTED',
      };
    },
    verifyWebhook(rawBody, signature) {
      if (!signature) return false;
      const expected = createHmac('sha256', cfg.signingKey).update(rawBody).digest('hex');
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      return a.length === b.length && timingSafeEqual(a, b);
    },
  };
}

/** True when real Uber Direct credentials are present (the live provider path). */
export function isUberDirectConfigured(): boolean {
  return Boolean(
    process.env.UBER_DIRECT_CUSTOMER_ID &&
      process.env.UBER_DIRECT_CLIENT_ID &&
      process.env.UBER_DIRECT_CLIENT_SECRET &&
      process.env.UBER_DIRECT_SIGNING_KEY,
  );
}

/**
 * Unlike getStripe/getStorageProvider (which return null when unconfigured), this
 * ALWAYS returns a provider: the real Uber Direct courier when UBER_DIRECT_* is
 * configured, otherwise the deterministic mock — so pickup/delivery flows work
 * end to end with zero external credentials.
 */
export function getDeliveryProvider(): DeliveryProvider {
  if (isUberDirectConfigured()) {
    return uberProvider({
      customerId: process.env.UBER_DIRECT_CUSTOMER_ID!,
      clientId: process.env.UBER_DIRECT_CLIENT_ID!,
      clientSecret: process.env.UBER_DIRECT_CLIENT_SECRET!,
      signingKey: process.env.UBER_DIRECT_SIGNING_KEY!,
    });
  }
  return mockProvider;
}
