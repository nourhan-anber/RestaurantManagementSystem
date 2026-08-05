-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'quoted', 'requested', 'picked_up', 'dropped_off', 'cancelled', 'failed');

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "order_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT,
    "quote_id" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "tracking_url" TEXT,
    "fee" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_order_id_key" ON "deliveries"("order_id");

-- CreateIndex
CREATE INDEX "deliveries_provider_external_id_idx" ON "deliveries"("provider", "external_id");

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

