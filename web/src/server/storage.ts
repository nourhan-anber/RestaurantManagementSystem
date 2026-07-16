export interface StorageProvider {
  upload(input: { bytes: Buffer; contentType: string; filename: string }): Promise<{ url: string }>;
}

let cached: StorageProvider | null = null;

/** True when object storage is configured (Vercel Blob). Otherwise URL-paste only. */
export function isUploadConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** The storage provider, or null when uploads aren't configured. */
export function getStorageProvider(): StorageProvider | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  cached ??= {
    async upload({ bytes, contentType, filename }) {
      const { put } = await import('@vercel/blob');
      const blob = await put(`menu/${filename}`, bytes, {
        access: 'public',
        contentType,
        token,
      });
      return { url: blob.url };
    },
  };
  return cached;
}
