-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('PNR', 'PNNR', 'PJD', 'PJND');

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'VOID');

-- AlterTable
ALTER TABLE "ExpenseCategory" ADD COLUMN     "islrConceptId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseBill" ADD COLUMN     "customsExpedientNumber" TEXT,
ADD COLUMN     "fiscalMonth" INTEGER,
ADD COLUMN     "fiscalYear" INTEGER,
ADD COLUMN     "importDocketNumber" TEXT,
ADD COLUMN     "noTaxCredit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noTaxCreditAmt" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount16" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount8" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxableAmount16" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxableAmount8" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN     "fiscalMonth" INTEGER,
ADD COLUMN     "fiscalYear" INTEGER,
ADD COLUMN     "taxAmount16" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount31" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount8" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxableAmount16" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxableAmount31" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxableAmount8" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "personType" "PersonType";

-- CreateTable
CREATE TABLE "DocumentFormat" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "headerText" TEXT,
    "footerText" TEXT,
    "legalText" TEXT,
    "agentSignatureLabel" TEXT,
    "subjectSignatureLabel" TEXT,
    "stampUrl" TEXT,

    CONSTRAINT "DocumentFormat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IslrConcept" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IslrConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IslrRate" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "personType" "PersonType" NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "sustraendoFact" DECIMAL(12,4) NOT NULL,
    "minBaseUt" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "IslrRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalParameter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IslrRetention" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "controlNumber" TEXT NOT NULL,
    "retentionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalInvoice" DECIMAL(12,2) NOT NULL,
    "taxableBase" DECIMAL(12,2) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "sustraendo" DECIMAL(12,2) NOT NULL,
    "retainedAmount" DECIMAL(12,2) NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IslrRetention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT,
    "supplierId" TEXT,
    "noteNumber" TEXT NOT NULL,
    "controlNumber" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fiscalMonth" INTEGER NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "affectedSalesInvoiceId" TEXT,
    "affectedPurchaseBillId" TEXT,
    "isExtemporaneous" BOOLEAN NOT NULL DEFAULT false,
    "affectedFiscalMonth" INTEGER,
    "affectedFiscalYear" INTEGER,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(12,4) NOT NULL,
    "exemptAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableAmount16" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount16" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableAmount8" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount8" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "status" "NoteStatus" NOT NULL DEFAULT 'ISSUED',
    "inBook" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebitNote" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT,
    "noteNumber" TEXT NOT NULL,
    "controlNumber" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fiscalMonth" INTEGER NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "affectedSalesInvoiceId" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(12,4) NOT NULL,
    "exemptAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableAmount16" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount16" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableAmount8" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount8" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "status" "NoteStatus" NOT NULL DEFAULT 'ISSUED',
    "inBook" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebitNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IvaRetentionReceived" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "salesInvoiceId" TEXT NOT NULL,
    "controlNumber" TEXT NOT NULL,
    "retentionDate" TIMESTAMP(3) NOT NULL,
    "retentionMonth" INTEGER NOT NULL,
    "retentionYear" INTEGER NOT NULL,
    "retainedAmount" DECIMAL(12,2) NOT NULL,
    "taxableBase" DECIMAL(12,2) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IvaRetentionReceived_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFormat_companyId_documentType_key" ON "DocumentFormat"("companyId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "IslrConcept_code_key" ON "IslrConcept"("code");

-- CreateIndex
CREATE UNIQUE INDEX "IslrRate_conceptId_personType_key" ON "IslrRate"("conceptId", "personType");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalParameter_name_key" ON "FiscalParameter"("name");

-- CreateIndex
CREATE UNIQUE INDEX "IslrRetention_controlNumber_key" ON "IslrRetention"("controlNumber");

-- CreateIndex
CREATE INDEX "IslrRetention_companyId_retentionDate_idx" ON "IslrRetention"("companyId", "retentionDate");

-- CreateIndex
CREATE INDEX "CreditNote_companyId_fiscalYear_fiscalMonth_idx" ON "CreditNote"("companyId", "fiscalYear", "fiscalMonth");

-- CreateIndex
CREATE INDEX "CreditNote_affectedSalesInvoiceId_idx" ON "CreditNote"("affectedSalesInvoiceId");

-- CreateIndex
CREATE INDEX "CreditNote_affectedPurchaseBillId_idx" ON "CreditNote"("affectedPurchaseBillId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_companyId_noteNumber_key" ON "CreditNote"("companyId", "noteNumber");

-- CreateIndex
CREATE INDEX "DebitNote_companyId_fiscalYear_fiscalMonth_idx" ON "DebitNote"("companyId", "fiscalYear", "fiscalMonth");

-- CreateIndex
CREATE INDEX "DebitNote_affectedSalesInvoiceId_idx" ON "DebitNote"("affectedSalesInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "DebitNote_companyId_noteNumber_key" ON "DebitNote"("companyId", "noteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "IvaRetentionReceived_controlNumber_key" ON "IvaRetentionReceived"("controlNumber");

-- CreateIndex
CREATE INDEX "IvaRetentionReceived_companyId_retentionYear_retentionMonth_idx" ON "IvaRetentionReceived"("companyId", "retentionYear", "retentionMonth");

-- CreateIndex
CREATE INDEX "IvaRetentionReceived_salesInvoiceId_idx" ON "IvaRetentionReceived"("salesInvoiceId");

-- CreateIndex
CREATE INDEX "PurchaseBill_companyId_fiscalYear_fiscalMonth_idx" ON "PurchaseBill"("companyId", "fiscalYear", "fiscalMonth");

-- CreateIndex
CREATE INDEX "SalesInvoice_companyId_fiscalYear_fiscalMonth_idx" ON "SalesInvoice"("companyId", "fiscalYear", "fiscalMonth");

-- AddForeignKey
ALTER TABLE "DocumentFormat" ADD CONSTRAINT "DocumentFormat_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_islrConceptId_fkey" FOREIGN KEY ("islrConceptId") REFERENCES "IslrConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IslrRate" ADD CONSTRAINT "IslrRate_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "IslrConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IslrRetention" ADD CONSTRAINT "IslrRetention_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IslrRetention" ADD CONSTRAINT "IslrRetention_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "IslrConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IslrRetention" ADD CONSTRAINT "IslrRetention_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_affectedSalesInvoiceId_fkey" FOREIGN KEY ("affectedSalesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_affectedPurchaseBillId_fkey" FOREIGN KEY ("affectedPurchaseBillId") REFERENCES "PurchaseBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_affectedSalesInvoiceId_fkey" FOREIGN KEY ("affectedSalesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IvaRetentionReceived" ADD CONSTRAINT "IvaRetentionReceived_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IvaRetentionReceived" ADD CONSTRAINT "IvaRetentionReceived_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
