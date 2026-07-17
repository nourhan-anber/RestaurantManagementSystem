import { headers } from 'next/headers';

/**
 * The origin the current request actually arrived on — e.g. an ngrok tunnel, a
 * production domain, or localhost — for building absolute URLs (QR codes, Stripe
 * redirect targets, invite links). Prefers the forwarded host set by a proxy so
 * links match wherever the app is being accessed from; falls back to AUTH_URL.
 */
export async function requestBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (host) {
    const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  return process.env.AUTH_URL ?? '';
}
