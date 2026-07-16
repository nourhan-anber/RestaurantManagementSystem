import type { PrismaClient } from '@/generated/prisma/client';
import type { TableInput } from '@/lib/validation/table';

export function listTables(db: PrismaClient, restaurantId: number) {
  return db.table.findMany({ where: { restaurantId }, orderBy: { number: 'asc' } });
}

export function createTable(db: PrismaClient, restaurantId: number, input: TableInput) {
  return db.table.create({
    data: { restaurantId, number: input.number, capacity: input.capacity, isActive: input.isActive },
  });
}

// Scoped write: a foreign id matches zero rows.
export function updateTable(db: PrismaClient, restaurantId: number, id: number, input: TableInput) {
  return db.table.updateMany({ where: { id, restaurantId }, data: input });
}

export function deleteTable(db: PrismaClient, restaurantId: number, id: number) {
  return db.table.deleteMany({ where: { id, restaurantId } });
}

export async function findTableById(db: PrismaClient, restaurantId: number, id: number) {
  return db.table.findFirst({ where: { id, restaurantId } });
}
