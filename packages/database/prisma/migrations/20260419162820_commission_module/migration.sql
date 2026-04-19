-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENT_ON_TOTAL', 'PERCENT_ON_MARGIN', 'FIXED_PER_PRODUCT');

-- CreateEnum
CREATE TYPE "CommissionLedgerType" AS ENUM ('EARNED', 'CLAWBACK', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "PaymentOut" ADD COLUMN     "eventId" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "salespersonId" TEXT;

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN     "salespersonId" TEXT;

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "salespersonId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSalesperson" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Income" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientName" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeEventDetail" (
    "id" TEXT NOT NULL,
    "incomeId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "amountApplied" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "IncomeEventDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CommissionType" NOT NULL DEFAULT 'PERCENT_ON_TOTAL',
    "rate" DECIMAL(8,4) NOT NULL,
    "fixedAmount" DECIMAL(12,2),
    "salespersonId" TEXT,
    "productId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionLedger" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "salesInvoiceId" TEXT NOT NULL,
    "paymentInId" TEXT,
    "creditNoteId" TEXT,
    "type" "CommissionLedgerType" NOT NULL DEFAULT 'EARNED',
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "rate" DECIMAL(8,4) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "description" TEXT,
    "fiscalMonth" INTEGER NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_companyId_date_idx" ON "Event"("companyId", "date");

-- CreateIndex
CREATE INDEX "CommissionRule_companyId_isActive_idx" ON "CommissionRule"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "CommissionRule_companyId_salespersonId_idx" ON "CommissionRule"("companyId", "salespersonId");

-- CreateIndex
CREATE INDEX "CommissionRule_companyId_productId_idx" ON "CommissionRule"("companyId", "productId");

-- CreateIndex
CREATE INDEX "CommissionLedger_companyId_salespersonId_fiscalYear_fiscalM_idx" ON "CommissionLedger"("companyId", "salespersonId", "fiscalYear", "fiscalMonth");

-- CreateIndex
CREATE INDEX "CommissionLedger_companyId_salesInvoiceId_idx" ON "CommissionLedger"("companyId", "salesInvoiceId");

-- CreateIndex
CREATE INDEX "CommissionLedger_companyId_fiscalYear_fiscalMonth_idx" ON "CommissionLedger"("companyId", "fiscalYear", "fiscalMonth");

-- CreateIndex
CREATE INDEX "CommissionLedger_salespersonId_createdAt_idx" ON "CommissionLedger"("salespersonId", "createdAt");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeEventDetail" ADD CONSTRAINT "IncomeEventDetail_incomeId_fkey" FOREIGN KEY ("incomeId") REFERENCES "Income"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeEventDetail" ADD CONSTRAINT "IncomeEventDetail_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOut" ADD CONSTRAINT "PaymentOut_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CommissionRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
