-- Sales tax: per-restaurant config + per-order snapshot + payment tax total.
-- Tax is add-on (exclusive): order.total = order.subtotal + order.tax_amount.

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_rate_percent" DECIMAL(6,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "tax_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tax_label" TEXT NOT NULL DEFAULT 'Tax',
ADD COLUMN     "tax_rate_percent" DECIMAL(6,4) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_region" TEXT;

-- Hand-authored: existing orders predate tax — their total is the (pre-tax) subtotal.
UPDATE "orders" SET "subtotal" = "total";

-- Hand-authored: money and rates are non-negative.
ALTER TABLE "orders" ADD CONSTRAINT "orders_tax_nonneg"
  CHECK ("subtotal" >= 0 AND "tax_amount" >= 0 AND "tax_rate_percent" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_tax_nonneg"
  CHECK ("tax_amount" >= 0);
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_tax_rate_nonneg"
  CHECK ("tax_rate_percent" >= 0);
