import { describe, expect, it } from 'vitest';
import { extensionForType, MAX_IMAGE_BYTES, validateUpload } from './upload';

describe('validateUpload', () => {
  it('accepts allowed types within the size limit', () => {
    expect(validateUpload('image/png', 1000)).toEqual({ ok: true });
    expect(validateUpload('image/jpeg', MAX_IMAGE_BYTES)).toEqual({ ok: true });
  });

  it('rejects disallowed types', () => {
    expect(validateUpload('image/gif', 1000)).toEqual({ ok: false, reason: 'type' });
    expect(validateUpload('application/pdf', 1000)).toEqual({ ok: false, reason: 'type' });
  });

  it('rejects empty or oversized files', () => {
    expect(validateUpload('image/png', 0)).toEqual({ ok: false, reason: 'size' });
    expect(validateUpload('image/png', MAX_IMAGE_BYTES + 1)).toEqual({ ok: false, reason: 'size' });
  });
});

describe('extensionForType', () => {
  it('maps content types to extensions', () => {
    expect(extensionForType('image/png')).toBe('png');
    expect(extensionForType('image/webp')).toBe('webp');
    expect(extensionForType('image/jpeg')).toBe('jpg');
  });
});
