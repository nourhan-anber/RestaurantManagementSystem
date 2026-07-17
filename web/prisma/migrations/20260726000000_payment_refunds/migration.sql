-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "refund_reason" TEXT,
ADD COLUMN     "refunded_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "refunded_at" TIMESTAMP(3);
