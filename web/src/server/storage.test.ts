import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStorageProvider, isUploadConfigured } from './storage';

afterEach(() => vi.unstubAllEnvs());

describe('storage configuration gate', () => {
  it('is unconfigured (URL-paste only) without a blob token', () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    expect(isUploadConfigured()).toBe(false);
    expect(getStorageProvider()).toBeNull();
  });

  it('exposes a provider when a blob token is set', () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_token');
    expect(isUploadConfigured()).toBe(true);
    expect(getStorageProvider()).not.toBeNull();
  });
});
