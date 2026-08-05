-- P1: restaurant branding (logo/description/phone/address/timezone) + online-ordering
-- toggle + per-day opening hours.

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "address" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "online_ordering_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateTable
CREATE TABLE "opening_hours" (
    "id" TEXT NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "opens_minutes" INTEGER NOT NULL,
    "closes_minutes" INTEGER NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "opening_hours_restaurant_id_day_of_week_key" ON "opening_hours"("restaurant_id", "day_of_week");

-- AddForeignKey
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-authored: keep minutes within a day and the weekday in range.
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_minutes_range"
  CHECK ("opens_minutes" BETWEEN 0 AND 1440 AND "closes_minutes" BETWEEN 0 AND 1440);
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_day_range"
  CHECK ("day_of_week" BETWEEN 0 AND 6);
