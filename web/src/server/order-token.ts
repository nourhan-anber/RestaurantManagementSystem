import { createHmac, timingSafeEqual } from 'node:crypto';

// A self-contained, unguessable status token for a public order-tracking link:
// "<orderId>.<hmac>". The orderId travels in the token so the URL is stateless; the
// HMAC over "o:<orderId>" makes it unforgeable, so orders can't be enumerated by id.
function secret(): string {
  return process.env.ORDER_SECRET_KEY ?? process.env.TABLE_SECRET_KEY ?? 'dev-insecure-order-secret-do-not-use';
}

function sign(orderId: number): string {
  return createHmac('sha256', secret()).update(`o:${orderId}`).digest('base64url');
}

export function generateOrderToken(orderId: number): string {
  return `${orderId}.${sign(orderId)}`;
}

/** Recover the orderId from a token when its signature checks out; otherwise null. */
export function verifyOrderToken(token: string | null | undefined): number | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;

  const orderId = Number(token.slice(0, dot));
  if (!Number.isInteger(orderId) || orderId <= 0) return null;

  try {
    const expected = Buffer.from(sign(orderId), 'utf8');
    const provided = Buffer.from(token.slice(dot + 1), 'utf8');
    if (expected.length !== provided.length) return null;
    return timingSafeEqual(expected, provided) ? orderId : null;
  } catch {
    return null;
  }
}
