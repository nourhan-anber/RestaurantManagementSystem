import type { PrismaClient } from '@/generated/prisma/client';
import type { ModifierGroupInput, ModifierOptionInput } from '@/lib/validation/modifier';

// Modifier tables have no restaurantId — isolation is transitive through the
// parent menu item, so every write first proves the parent belongs to the tenant.

async function itemInRestaurant(db: PrismaClient, restaurantId: number, menuItemId: number) {
  return (
    (await db.menuItem.findFirst({ where: { id: menuItemId, restaurantId }, select: { id: true } })) !==
    null
  );
}

async function groupInRestaurant(db: PrismaClient, restaurantId: number, groupId: number) {
  return (
    (await db.modifierGroup.findFirst({
      where: { id: groupId, menuItem: { restaurantId } },
      select: { id: true },
    })) !== null
  );
}

async function optionInRestaurant(db: PrismaClient, restaurantId: number, optionId: number) {
  return (
    (await db.modifierOption.findFirst({
      where: { id: optionId, group: { menuItem: { restaurantId } } },
      select: { id: true },
    })) !== null
  );
}

export type ModifierResult = { ok: true } | { ok: false };

export async function createGroup(
  db: PrismaClient,
  restaurantId: number,
  menuItemId: number,
  input: ModifierGroupInput,
): Promise<ModifierResult> {
  if (!(await itemInRestaurant(db, restaurantId, menuItemId))) return { ok: false };
  const position = await db.modifierGroup.count({ where: { menuItemId } });
  await db.modifierGroup.create({
    data: { menuItemId, name: input.name, minSelect: input.minSelect, maxSelect: input.maxSelect, position },
  });
  return { ok: true };
}

export async function updateGroup(
  db: PrismaClient,
  restaurantId: number,
  groupId: number,
  input: ModifierGroupInput,
): Promise<ModifierResult> {
  if (!(await groupInRestaurant(db, restaurantId, groupId))) return { ok: false };
  await db.modifierGroup.update({
    where: { id: groupId },
    data: { name: input.name, minSelect: input.minSelect, maxSelect: input.maxSelect },
  });
  return { ok: true };
}

export async function deleteGroup(
  db: PrismaClient,
  restaurantId: number,
  groupId: number,
): Promise<ModifierResult> {
  if (!(await groupInRestaurant(db, restaurantId, groupId))) return { ok: false };
  await db.modifierGroup.delete({ where: { id: groupId } });
  return { ok: true };
}

export async function createOption(
  db: PrismaClient,
  restaurantId: number,
  groupId: number,
  input: ModifierOptionInput,
): Promise<ModifierResult> {
  if (!(await groupInRestaurant(db, restaurantId, groupId))) return { ok: false };
  const position = await db.modifierOption.count({ where: { groupId } });
  await db.modifierOption.create({
    data: { groupId, name: input.name, priceDelta: input.priceDelta, isAvailable: input.isAvailable, position },
  });
  return { ok: true };
}

export async function updateOption(
  db: PrismaClient,
  restaurantId: number,
  optionId: number,
  input: ModifierOptionInput,
): Promise<ModifierResult> {
  if (!(await optionInRestaurant(db, restaurantId, optionId))) return { ok: false };
  await db.modifierOption.update({
    where: { id: optionId },
    data: { name: input.name, priceDelta: input.priceDelta, isAvailable: input.isAvailable },
  });
  return { ok: true };
}

export async function deleteOption(
  db: PrismaClient,
  restaurantId: number,
  optionId: number,
): Promise<ModifierResult> {
  if (!(await optionInRestaurant(db, restaurantId, optionId))) return { ok: false };
  await db.modifierOption.delete({ where: { id: optionId } });
  return { ok: true };
}
