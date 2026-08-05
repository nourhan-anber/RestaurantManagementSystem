import { describe, expect, it } from 'vitest';
import { authorizeAbility, can, findMembership } from './authz';
import type { SessionMembership } from './auth-helpers';

const owner: SessionMembership = { restaurantId: 1, restaurantSlug: 'bella-vista', role: 'OWNER' };
const chef: SessionMembership = { restaurantId: 2, restaurantSlug: 'nonna', role: 'CHEF' };

describe('can', () => {
  it('grants the owner every ability', () => {
    for (const action of ['menu:write', 'table:write', 'order:advance', 'staff:manage', 'reports:view', 'payment:refund', 'settings:write'] as const) {
      expect(can('OWNER', action)).toBe(true);
    }
  });

  it('denies the manager settings/billing but allows refunds', () => {
    expect(can('MANAGER', 'settings:write')).toBe(false);
    expect(can('MANAGER', 'menu:write')).toBe(true);
    expect(can('MANAGER', 'payment:refund')).toBe(true);
  });

  it('denies floor/kitchen roles the refund ability', () => {
    expect(can('CHEF', 'payment:refund')).toBe(false);
    expect(can('SERVER', 'payment:refund')).toBe(false);
  });

  it('limits the chef to advancing orders', () => {
    expect(can('CHEF', 'order:advance')).toBe(true);
    expect(can('CHEF', 'menu:write')).toBe(false);
  });

  it('lets the server work the floor but not the menu', () => {
    expect(can('SERVER', 'table:write')).toBe(true);
    expect(can('SERVER', 'order:advance')).toBe(true);
    expect(can('SERVER', 'menu:write')).toBe(false);
  });
});

describe('findMembership', () => {
  it('matches by slug', () => {
    expect(findMembership([owner, chef], 'nonna')).toBe(chef);
  });
  it('returns undefined when absent', () => {
    expect(findMembership([owner], 'nope')).toBeUndefined();
  });
});

describe('authorizeAbility', () => {
  it('rejects an unauthenticated session', () => {
    expect(authorizeAbility(null, 'bella-vista', 'menu:write')).toEqual({
      ok: false,
      reason: 'unauthenticated',
    });
    expect(authorizeAbility({}, 'bella-vista', 'menu:write')).toEqual({
      ok: false,
      reason: 'unauthenticated',
    });
  });

  it('forbids a user with no membership for the tenant (cross-tenant)', () => {
    expect(
      authorizeAbility({ user: { memberships: [owner] } }, 'nonna', 'order:advance'),
    ).toEqual({ ok: false, reason: 'forbidden' });
  });

  it('forbids a member whose role lacks the ability', () => {
    expect(
      authorizeAbility({ user: { memberships: [chef] } }, 'nonna', 'menu:write'),
    ).toEqual({ ok: false, reason: 'forbidden' });
  });

  it('allows a member with the ability and returns the membership', () => {
    const result = authorizeAbility({ user: { memberships: [owner] } }, 'bella-vista', 'menu:write');
    expect(result).toEqual({ ok: true, membership: owner });
  });

  it('treats missing memberships as no access', () => {
    expect(authorizeAbility({ user: {} }, 'bella-vista', 'menu:write')).toEqual({
      ok: false,
      reason: 'forbidden',
    });
  });
});
