import { afterEach, describe, expect, it, vi } from 'vitest';

const headersMock = vi.fn();
vi.mock('next/headers', () => ({ headers: () => headersMock() }));

import { requestBaseUrl } from './base-url';

function fakeHeaders(map: Record<string, string>) {
  return { get: (k: string) => map[k.toLowerCase()] ?? null };
}

afterEach(() => {
  headersMock.mockReset();
});

describe('requestBaseUrl', () => {
  it('uses the forwarded host + proto (ngrok tunnel)', async () => {
    headersMock.mockResolvedValue(
      fakeHeaders({ 'x-forwarded-host': 'abc123.ngrok-free.app', 'x-forwarded-proto': 'https' }),
    );
    expect(await requestBaseUrl()).toBe('https://abc123.ngrok-free.app');
  });

  it('falls back to Host and infers http for localhost', async () => {
    headersMock.mockResolvedValue(fakeHeaders({ host: 'localhost:3000' }));
    expect(await requestBaseUrl()).toBe('http://localhost:3000');
  });

  it('defaults a non-localhost host without a proto header to https', async () => {
    headersMock.mockResolvedValue(fakeHeaders({ host: 'menu.example.com' }));
    expect(await requestBaseUrl()).toBe('https://menu.example.com');
  });

  it('falls back to AUTH_URL when there is no host header', async () => {
    headersMock.mockResolvedValue(fakeHeaders({}));
    const prev = process.env.AUTH_URL;
    process.env.AUTH_URL = 'http://fallback.test';
    expect(await requestBaseUrl()).toBe('http://fallback.test');
    if (prev === undefined) delete process.env.AUTH_URL;
    else process.env.AUTH_URL = prev;
  });
});
