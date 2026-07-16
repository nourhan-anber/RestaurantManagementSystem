import { describe, expect, it } from 'vitest';
import { acceptInviteSchema, inviteStaffSchema } from './staff';

describe('inviteStaffSchema', () => {
  it('accepts an invitable role and normalizes email', () => {
    expect(inviteStaffSchema.parse({ email: 'Chef@X.TEST', role: 'CHEF' })).toEqual({
      email: 'chef@x.test',
      role: 'CHEF',
    });
  });

  it('rejects OWNER (no privilege escalation via invite)', () => {
    expect(inviteStaffSchema.safeParse({ email: 'a@b.com', role: 'OWNER' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(inviteStaffSchema.safeParse({ email: 'nope', role: 'CHEF' }).success).toBe(false);
  });
});

describe('acceptInviteSchema', () => {
  it('accepts a name and 8+ char password', () => {
    expect(acceptInviteSchema.safeParse({ name: 'Sam', password: 'longenough' }).success).toBe(true);
  });

  it('rejects a short password', () => {
    expect(acceptInviteSchema.safeParse({ name: 'Sam', password: 'short' }).success).toBe(false);
  });
});
