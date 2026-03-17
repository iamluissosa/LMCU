-- AlterTable
ALTER TABLE "PurchaseBillItem" ADD COLUMN     "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountType" TEXT,
ADD COLUMN     "discountValue" DECIMAL(12,2);
