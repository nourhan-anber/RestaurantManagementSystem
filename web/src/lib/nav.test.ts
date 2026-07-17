import { describe, expect, it } from 'vitest';
import { RESTAURANT_SECTIONS, sectionHref, visibleSections } from './nav';

const keys = (role: Parameters<typeof visibleSections>[0]) => visibleSections(role).map((s) => s.key);

describe('visibleSections', () => {
  it('shows the owner every section', () => {
    expect(keys('OWNER')).toEqual([
      'menu',
      'tables',
      'kitchen',
      'floor',
      'reservations',
      'staff',
      'orders',
      'customers',
      'reports',
      'settings',
    ]);
  });

  it('hides settings from the manager', () => {
    expect(keys('MANAGER')).toEqual([
      'menu',
      'tables',
      'kitchen',
      'floor',
      'reservations',
      'staff',
      'orders',
      'customers',
      'reports',
    ]);
  });

  it('shows the chef only the kitchen', () => {
    expect(keys('CHEF')).toEqual(['kitchen']);
  });

  it('shows the server tables, kitchen, floor, and reservations', () => {
    expect(keys('SERVER')).toEqual(['tables', 'kitchen', 'floor', 'reservations']);
  });
});

describe('sectionHref', () => {
  it('builds the tenant-scoped path', () => {
    expect(sectionHref('bella-vista', RESTAURANT_SECTIONS[0])).toBe('/r/bella-vista/menu');
  });
});
