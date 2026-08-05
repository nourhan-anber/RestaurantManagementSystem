-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "loyalty_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "points_per_dollar" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "redeem_value_per_point" DECIMAL(10,4) NOT NULL DEFAULT 0.01;

-- CreateTable
CREATE TABLE "points_ledger" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "order_id" INTEGER,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "points_ledger_order_id_key" ON "points_ledger"("order_id");

-- CreateIndex
CREATE INDEX "points_ledger_customer_id_idx" ON "points_ledger"("customer_id");

-- AddForeignKey
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
