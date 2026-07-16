import { describe, expect, it } from 'vitest';
import { loginSchema } from './auth';

describe('loginSchema', () => {
  it('accepts a valid email and password, normalizing the email', () => {
    const parsed = loginSchema.parse({ email: '  Owner@Bella.TEST ', password: 'pw' });
    expect(parsed).toEqual({ email: 'owner@bella.test', password: 'pw' });
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'pw' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
  });
});
