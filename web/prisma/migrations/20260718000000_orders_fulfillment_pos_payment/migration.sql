-- P0: order fulfillment types (dine-in / pickup / delivery, nullable table) + POS
-- payment fields (method, table_id, transaction_id). Hand-authored additions:
-- order-type invariant CHECKs and a null-safe guard on the occupy trigger.

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'online', 'other');
CREATE TYPE "OrderType" AS ENUM ('dine_in', 'pickup', 'delivery');

-- AlterTable: orders — fulfillment fields; table_id becomes nullable (online orders)
ALTER TABLE "orders" ADD COLUMN     "customer_name" TEXT,
ADD COLUMN     "customer_phone" TEXT,
ADD COLUMN     "delivery_address" TEXT,
ADD COLUMN     "delivery_notes" TEXT,
ADD COLUMN     "order_type" "OrderType" NOT NULL DEFAULT 'dine_in',
ADD COLUMN     "requested_time" TIMESTAMP(3),
ALTER COLUMN "table_id" DROP NOT NULL;

-- AlterTable: payments — POS method + reference + bill-level table link
ALTER TABLE "payments" ADD COLUMN     "method" "PaymentMethod" NOT NULL DEFAULT 'other',
ADD COLUMN     "table_id" INTEGER,
ADD COLUMN     "transaction_id" TEXT;

-- CreateIndex
CREATE INDEX "payments_table_id_idx" ON "payments"("table_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Hand-authored: order-type invariants (not expressible in the Prisma schema) ──
-- Existing rows are all dine_in with a table_id, so these pass on backfill.
ALTER TABLE "orders" ADD CONSTRAINT "orders_dine_in_requires_table"
  CHECK ("order_type" <> 'dine_in' OR "table_id" IS NOT NULL);
ALTER TABLE "orders" ADD CONSTRAINT "orders_online_has_no_table"
  CHECK ("order_type" = 'dine_in' OR "table_id" IS NULL);
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_requires_address"
  CHECK ("order_type" <> 'delivery' OR "delivery_address" IS NOT NULL);

-- ── Hand-authored: make the occupy trigger an explicit no-op for tableless orders ──
-- (WHERE id = NULL already matches zero rows; this is defense-in-depth. Idempotent.)
CREATE OR REPLACE FUNCTION set_table_occupied()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."table_id" IS NULL THEN
    RETURN NEW;
  END IF;
  UPDATE "tables" SET "status" = 'occupied' WHERE "id" = NEW."table_id";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
