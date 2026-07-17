import type { Role } from '@/generated/prisma/enums';
import { can, type Action } from '@/server/authz';

export interface RestaurantSection {
  key: string;
  label: string;
  description: string;
  /** Path segment under /r/[slug]. */
  segment: string;
  /** Ability that gates this section — nav is derived from the RBAC matrix. */
  action: Action;
}

export const RESTAURANT_SECTIONS: readonly RestaurantSection[] = [
  { key: 'menu', label: 'Menu', description: 'Dishes, categories, prices, availability.', segment: 'menu', action: 'menu:write' },
  { key: 'tables', label: 'Tables', description: 'Seating, capacity, and QR codes.', segment: 'tables', action: 'table:write' },
  { key: 'kitchen', label: 'Kitchen', description: 'Live order display for the pass.', segment: 'kitchen', action: 'order:advance' },
  { key: 'floor', label: 'Floor', description: 'Open tables, take and close bills.', segment: 'floor', action: 'table:write' },
  { key: 'staff', label: 'Staff', description: 'Invite and manage your team.', segment: 'staff', action: 'staff:manage' },
  { key: 'orders', label: 'Orders', description: 'Full order history, filter by date.', segment: 'orders', action: 'reports:view' },
  { key: 'customers', label: 'Customers', description: 'Guest directory from orders.', segment: 'customers', action: 'reports:view' },
  { key: 'reports', label: 'Reports', description: 'Sales, orders, and table turnover.', segment: 'reports', action: 'reports:view' },
  { key: 'settings', label: 'Settings', description: 'Restaurant profile and billing.', segment: 'settings', action: 'settings:write' },
];

/** Sections the role may access, derived from the RBAC matrix. */
export function visibleSections(role: Role): RestaurantSection[] {
  return RESTAURANT_SECTIONS.filter((s) => can(role, s.action));
}

export function sectionHref(slug: string, section: RestaurantSection): string {
  return `/r/${slug}/${section.segment}`;
}
