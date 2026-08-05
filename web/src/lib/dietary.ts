import type { DietaryTag } from '@/generated/prisma/enums';

export const DIETARY_LABELS: Record<DietaryTag, string> = {
  VEGETARIAN: 'Vegetarian',
  VEGAN: 'Vegan',
  GLUTEN_FREE: 'Gluten-free',
  DAIRY_FREE: 'Dairy-free',
  CONTAINS_NUTS: 'Contains nuts',
  HALAL: 'Halal',
};

export const DIETARY_TAGS = Object.keys(DIETARY_LABELS) as DietaryTag[];

export const MAX_SPICE = 3;

/** An item matches the filter when it carries every active tag (AND semantics). */
export function matchesDietary(itemTags: DietaryTag[], activeTags: DietaryTag[]): boolean {
  return activeTags.every((t) => itemTags.includes(t));
}
