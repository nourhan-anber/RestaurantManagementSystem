export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export type UploadCheck = { ok: true } | { ok: false; reason: 'type' | 'size' };

/** Validate an image upload's content type and byte size. */
export function validateUpload(contentType: string, size: number): UploadCheck {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType)) {
    return { ok: false, reason: 'type' };
  }
  if (size <= 0 || size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: 'size' };
  }
  return { ok: true };
}

export function extensionForType(contentType: string): string {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}
