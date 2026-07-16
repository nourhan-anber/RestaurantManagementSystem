import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { resolvePostLoginPath, toSessionMemberships, verifyPassword } from './auth-helpers';

describe('verifyPassword', () => {
  it('returns true for a matching password', async () => {
    const hash = await bcrypt.hash('secret', 10);
    expect(await verifyPassword('secret', hash)).toBe(true);
  });

  it('returns false for a wrong password', async () => {
    const hash = await bcrypt.hash('secret', 10);
    expect(await verifyPassword('nope', hash)).toBe(false);
  });

  it('returns false when the hash is null or undefined', async () => {
    expect(await verifyPassword('secret', null)).toBe(false);
    expect(await verifyPassword('secret', undefined)).toBe(false);
  });
});

describe('toSessionMemberships', () => {
  it('flattens the restaurant slug into the compact shape', () => {
    expect(
      toSessionMemberships([
        { restaurantId: 1, role: 'OWNER', restaurant: { slug: 'bella-vista' } },
        { restaurantId: 2, role: 'CHEF', restaurant: { slug: 'nonna' } },
      ]),
    ).toEqual([
      { restaurantId: 1, restaurantSlug: 'bella-vista', role: 'OWNER' },
      { restaurantId: 2, restaurantSlug: 'nonna', role: 'CHEF' },
    ]);
  });

  it('returns an empty array when there are no memberships', () => {
    expect(toSessionMemberships([])).toEqual([]);
  });
});

describe('resolvePostLoginPath', () => {
  it('sends platform admins to /admin', () => {
    expect(resolvePostLoginPath({ isPlatformAdmin: true, memberships: [] })).toBe('/admin');
  });

  it('sends a user with no membership to /no-access', () => {
    expect(resolvePostLoginPath({ isPlatformAdmin: false, memberships: [] })).toBe('/no-access');
  });

  it.each([
    ['OWNER', 'menu'],
    ['MANAGER', 'menu'],
    ['CHEF', 'kitchen'],
    ['SERVER', 'floor'],
  ] as const)('routes %s to the %s section', (role, section) => {
    expect(
      resolvePostLoginPath({
        isPlatformAdmin: false,
        memberships: [{ restaurantId: 1, restaurantSlug: 'bella-vista', role }],
      }),
    ).toBe(`/r/bella-vista/${section}`);
  });
});
