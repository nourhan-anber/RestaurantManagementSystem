-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "storefront_template" TEXT NOT NULL DEFAULT 'classic',
ADD COLUMN     "theme_color" TEXT NOT NULL DEFAULT '#d8622d';

