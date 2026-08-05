import { describe, expect, it } from 'vitest';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
} from './auth';

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

describe('forgotPasswordSchema', () => {
  it('normalizes the email and rejects invalid ones', () => {
    expect(forgotPasswordSchema.parse({ email: ' A@B.COM ' })).toEqual({ email: 'a@b.com' });
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('requires at least 8 characters', () => {
    expect(resetPasswordSchema.safeParse({ password: 'longenough' }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: 'short' }).success).toBe(false);
  });
});

describe('profileSchema', () => {
  it('trims and requires a name', () => {
    expect(profileSchema.parse({ name: '  Ada  ' })).toEqual({ name: 'Ada' });
    expect(profileSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('requires the current password and an 8+ char new password', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'longenough' }).success).toBe(true);
    expect(changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'longenough' }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'short' }).success).toBe(false);
  });
});
