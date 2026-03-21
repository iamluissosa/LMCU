-- AlterTable
ALTER TABLE "PaymentOut" ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "currencyPref" TEXT NOT NULL DEFAULT 'MULTI';

-- AddForeignKey
ALTER TABLE "PaymentOut" ADD CONSTRAINT "PaymentOut_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
