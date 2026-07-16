-- Menu customization: managed categories, modifiers, dietary/spice, order guest info.
-- Hand-authored so the category free-text -> categoryId change runs expand -> backfill
-- -> contract (Prisma's generated drop-and-add-NOT-NULL would fail on existing rows).

-- CreateEnum
CREATE TYPE "DietaryTag" AS ENUM ('vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'contains_nuts', 'halal');

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_groups" (
    "id" SERIAL NOT NULL,
    "menu_item_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "min_select" INTEGER NOT NULL DEFAULT 0,
    "max_select" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_options" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price_delta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modifier_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_modifiers" (
    "id" SERIAL NOT NULL,
    "order_item_id" INTEGER NOT NULL,
    "option_id" INTEGER,
    "group_name" TEXT NOT NULL,
    "option_name" TEXT NOT NULL,
    "price_delta" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_categories_restaurant_id_position_idx" ON "menu_categories"("restaurant_id", "position");
CREATE UNIQUE INDEX "menu_categories_restaurant_id_name_key" ON "menu_categories"("restaurant_id", "name");
CREATE INDEX "modifier_groups_menu_item_id_position_idx" ON "modifier_groups"("menu_item_id", "position");
CREATE INDEX "modifier_options_group_id_position_idx" ON "modifier_options"("group_id", "position");
CREATE INDEX "order_item_modifiers_order_item_id_idx" ON "order_item_modifiers"("order_item_id");

-- AddForeignKey (new tables)
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "modifier_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── menu_items: expand ──────────────────────────────────────────────
ALTER TABLE "menu_items" ADD COLUMN "category_id" INTEGER;
ALTER TABLE "menu_items" ADD COLUMN "dietary_tags" "DietaryTag"[] DEFAULT ARRAY[]::"DietaryTag"[];
ALTER TABLE "menu_items" ADD COLUMN "spice_level" INTEGER NOT NULL DEFAULT 0;

-- ── backfill: one category per distinct (restaurant, category), then link ──
INSERT INTO "menu_categories" ("restaurant_id", "name", "position", "updated_at")
SELECT restaurant_id,
       category,
       ROW_NUMBER() OVER (PARTITION BY restaurant_id ORDER BY category) - 1,
       now()
FROM (SELECT DISTINCT restaurant_id, category FROM "menu_items") d;

UPDATE "menu_items" mi
SET "category_id" = mc.id
FROM "menu_categories" mc
WHERE mc.restaurant_id = mi.restaurant_id AND mc.name = mi.category;

-- ── menu_items: contract ────────────────────────────────────────────
ALTER TABLE "menu_items" ALTER COLUMN "category_id" SET NOT NULL;
DROP INDEX "menu_items_restaurant_id_category_idx";
ALTER TABLE "menu_items" DROP COLUMN "category";
CREATE INDEX "menu_items_restaurant_id_category_id_idx" ON "menu_items"("restaurant_id", "category_id");
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── orders: guest info ──────────────────────────────────────────────
ALTER TABLE "orders" ADD COLUMN "guest_name" TEXT;
ALTER TABLE "orders" ADD COLUMN "guest_email" TEXT;

-- ── hand-authored CHECK constraints (not expressible in the Prisma schema) ──
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_spice_level_range" CHECK ("spice_level" BETWEEN 0 AND 3);
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_min_select_nonneg" CHECK ("min_select" >= 0);
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_max_select_valid" CHECK ("max_select" IS NULL OR "max_select" >= 1);
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_max_ge_min" CHECK ("max_select" IS NULL OR "max_select" >= "min_select");
