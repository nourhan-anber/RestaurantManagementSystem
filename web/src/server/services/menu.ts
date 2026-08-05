import type { PrismaClient } from '@/generated/prisma/client';
import type { MenuItemInput } from '@/lib/validation/menu';

export function listMenu(db: PrismaClient, restaurantId: number) {
  return db.menuItem.findMany({
    where: { restaurantId },
    orderBy: [{ category: { position: 'asc' } }, { name: 'asc' }],
    include: {
      category: { select: { id: true, name: true, position: true } },
      modifierGroups: {
        orderBy: { position: 'asc' },
        include: { options: { orderBy: { position: 'asc' } } },
      },
    },
  });
}

export function createMenuItem(db: PrismaClient, restaurantId: number, input: MenuItemInput) {
  return db.menuItem.create({ data: { ...input, restaurantId } });
}

// Scoped write: `{ id, restaurantId }` means a foreign id updates zero rows.
export function updateMenuItem(
  db: PrismaClient,
  restaurantId: number,
  id: number,
  input: MenuItemInput,
) {
  return db.menuItem.updateMany({ where: { id, restaurantId }, data: input });
}

export function deleteMenuItem(db: PrismaClient, restaurantId: number, id: number) {
  return db.menuItem.deleteMany({ where: { id, restaurantId } });
}

/** Quick "86" — flip an item's availability without opening the full editor. Tenant-scoped. */
export function setItemAvailability(
  db: PrismaClient,
  restaurantId: number,
  id: number,
  isAvailable: boolean,
) {
  return db.menuItem.updateMany({ where: { id, restaurantId }, data: { isAvailable } });
}
