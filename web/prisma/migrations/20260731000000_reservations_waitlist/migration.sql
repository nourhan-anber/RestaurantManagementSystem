-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('booked', 'seated', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "ReservationSource" AS ENUM ('staff', 'online');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('waiting', 'seated', 'left');

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "table_id" INTEGER,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "party_size" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'booked',
    "source" "ReservationSource" NOT NULL DEFAULT 'staff',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "party_size" INTEGER NOT NULL,
    "quoted_minutes" INTEGER,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'waiting',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reservations_restaurant_id_at_idx" ON "reservations"("restaurant_id", "at");

-- CreateIndex
CREATE INDEX "waitlist_entries_restaurant_id_status_idx" ON "waitlist_entries"("restaurant_id", "status");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

