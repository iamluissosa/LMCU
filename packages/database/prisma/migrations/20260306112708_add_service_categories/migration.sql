-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('OPEN', 'PARTIALLY_RECEIVED', 'RECEIVED', 'BILLED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('UNPAID', 'PAID', 'VOID', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_USD', 'CASH_VES', 'ZELLE', 'TRANSFER_VES', 'TRANSFER_USD', 'PAGO_MOVIL');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'INVOICED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'VOID', 'OVERDUE');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rif" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "taxpayerType" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'FACT-',
    "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
    "productPrefix" TEXT NOT NULL DEFAULT 'PROD-',
    "nextProductCode" INTEGER NOT NULL DEFAULT 1,
    "purchaseOrderPrefix" TEXT NOT NULL DEFAULT 'OC-',
    "nextPurchaseOrder" INTEGER NOT NULL DEFAULT 1,
    "paymentOutPrefix" TEXT NOT NULL DEFAULT 'EGR-',
    "nextPaymentOutNumber" INTEGER NOT NULL DEFAULT 1,
    "nextRetentionIVANumber" INTEGER NOT NULL DEFAULT 1,
    "nextRetentionISLRNumber" INTEGER NOT NULL DEFAULT 1,
    "retentionPrefix" TEXT NOT NULL DEFAULT 'RET-',
    "fiscalYear" INTEGER NOT NULL DEFAULT 2026,
    "quotePrefix" TEXT NOT NULL DEFAULT 'COT-',
    "nextQuoteNumber" INTEGER NOT NULL DEFAULT 1,
    "salesOrderPrefix" TEXT NOT NULL DEFAULT 'PV-',
    "nextSalesOrderNumber" INTEGER NOT NULL DEFAULT 1,
    "salesInvoicePrefix" TEXT NOT NULL DEFAULT 'FACT-V-',
    "nextSalesInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
    "paymentInPrefix" TEXT NOT NULL DEFAULT 'COB-',
    "nextPaymentInNumber" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timeZone" TEXT NOT NULL DEFAULT 'America/Caracas',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "roleId" TEXT,
    "roleLegacy" TEXT NOT NULL DEFAULT 'USER',
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "costAverage" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "priceBase" DECIMAL(10,2) NOT NULL,
    "priceAlt" DECIMAL(10,2),
    "currentStock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rif" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "contactName" TEXT,
    "retentionISLR" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "paymentTerms" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'OPEN',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityOrdered" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantityReceived" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptNumber" TEXT NOT NULL,
    "comments" TEXT,
    "receivedById" TEXT,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptItem" (
    "id" TEXT NOT NULL,
    "goodsReceiptId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "GoodsReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseBill" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "controlNumber" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(12,4) NOT NULL,
    "exemptAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 16.00,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "retentionIVA" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rateRetIVA" DECIMAL(5,2) NOT NULL DEFAULT 75,
    "receiptRetIVA" TEXT,
    "retentionISLR" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rateRetISLR" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "receiptRetISLR" TEXT,
    "igtfAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "BillStatus" NOT NULL DEFAULT 'UNPAID',
    "inBook" BOOLEAN NOT NULL DEFAULT true,
    "isExpense" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseBillItem" (
    "id" TEXT NOT NULL,
    "purchaseBillId" TEXT NOT NULL,
    "productId" TEXT,
    "expenseCategoryId" TEXT,
    "description" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "islrRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalLine" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PurchaseBillItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOut" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "bankName" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "amountPaid" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentOut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOutDetail" (
    "id" TEXT NOT NULL,
    "paymentOutId" TEXT NOT NULL,
    "purchaseBillId" TEXT NOT NULL,
    "amountApplied" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PaymentOutDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rif" TEXT,
    "taxpayerType" TEXT,
    "isIvaAgent" BOOLEAN NOT NULL DEFAULT false,
    "islrRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "contactName" TEXT,
    "paymentTerms" INTEGER NOT NULL DEFAULT 0,
    "creditLimit" DECIMAL(12,2),
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" INTEGER NOT NULL,
    "controlNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 16.00,
    "totalLine" DECIMAL(12,2) NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DECIMAL(12,4) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "exemptAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "internalNote" TEXT,
    "salesOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "userId" TEXT,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT,
    "serviceCategoryId" TEXT,
    "description" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 16.00,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalLine" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'CONFIRMED',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "exemptAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryAddress" TEXT,
    "notes" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "userId" TEXT,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderItem" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "serviceCategoryId" TEXT,
    "description" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 16.00,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalLine" DECIMAL(12,2) NOT NULL,
    "quantityShipped" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "controlNumber" TEXT,
    "status" "SalesInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "salesOrderId" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "exemptAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 16.00,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "retIvaRate" DECIMAL(5,2) NOT NULL DEFAULT 75.00,
    "retentionIVA" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "receiptRetIVA" TEXT,
    "retISLRRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "retentionISLR" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "receiptRetISLR" TEXT,
    "igtfApplies" BOOLEAN NOT NULL DEFAULT false,
    "igtfRate" DECIMAL(4,2) NOT NULL DEFAULT 3.00,
    "igtfAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "inBook" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "userId" TEXT,

    CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoiceItem" (
    "id" TEXT NOT NULL,
    "salesInvoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "serviceCategoryId" TEXT,
    "description" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 16.00,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalLine" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "SalesInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIn" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "bankName" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "amountReceived" DECIMAL(12,2) NOT NULL,
    "igtfAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "userId" TEXT,

    CONSTRAINT "PaymentIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInDetail" (
    "id" TEXT NOT NULL,
    "paymentInId" TEXT NOT NULL,
    "salesInvoiceId" TEXT NOT NULL,
    "amountApplied" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PaymentInDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_rif_key" ON "Company"("rif");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_companyId_key" ON "CompanySettings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_companyId_name_key" ON "Role"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_companyId_name_key" ON "ServiceCategory"("companyId", "name");

-- CreateIndex
CREATE INDEX "Product_companyId_currentStock_idx" ON "Product"("companyId", "currentStock");

-- CreateIndex
CREATE INDEX "Product_companyId_isService_idx" ON "Product"("companyId", "isService");

-- CreateIndex
CREATE UNIQUE INDEX "Product_companyId_code_key" ON "Product"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_companyId_rif_key" ON "Supplier"("companyId", "rif");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_companyId_orderNumber_key" ON "PurchaseOrder"("companyId", "orderNumber");

-- CreateIndex
CREATE INDEX "PurchaseBill_companyId_status_idx" ON "PurchaseBill"("companyId", "status");

-- CreateIndex
CREATE INDEX "PurchaseBill_supplierId_status_idx" ON "PurchaseBill"("supplierId", "status");

-- CreateIndex
CREATE INDEX "PurchaseBill_issueDate_idx" ON "PurchaseBill"("issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_companyId_name_key" ON "ExpenseCategory"("companyId", "name");

-- CreateIndex
CREATE INDEX "PaymentOut_companyId_paymentDate_idx" ON "PaymentOut"("companyId", "paymentDate");

-- CreateIndex
CREATE INDEX "Client_companyId_rif_idx" ON "Client"("companyId", "rif");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_companyId_invoiceNumber_key" ON "Invoice"("companyId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "Quote_companyId_status_idx" ON "Quote"("companyId", "status");

-- CreateIndex
CREATE INDEX "Quote_companyId_issueDate_idx" ON "Quote"("companyId", "issueDate");

-- CreateIndex
CREATE INDEX "Quote_clientId_status_idx" ON "Quote"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_companyId_quoteNumber_key" ON "Quote"("companyId", "quoteNumber");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- CreateIndex
CREATE INDEX "SalesOrder_companyId_status_idx" ON "SalesOrder"("companyId", "status");

-- CreateIndex
CREATE INDEX "SalesOrder_companyId_orderDate_idx" ON "SalesOrder"("companyId", "orderDate");

-- CreateIndex
CREATE INDEX "SalesOrder_clientId_status_idx" ON "SalesOrder"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_companyId_orderNumber_key" ON "SalesOrder"("companyId", "orderNumber");

-- CreateIndex
CREATE INDEX "SalesOrderItem_salesOrderId_idx" ON "SalesOrderItem"("salesOrderId");

-- CreateIndex
CREATE INDEX "SalesInvoice_companyId_status_idx" ON "SalesInvoice"("companyId", "status");

-- CreateIndex
CREATE INDEX "SalesInvoice_companyId_issueDate_idx" ON "SalesInvoice"("companyId", "issueDate");

-- CreateIndex
CREATE INDEX "SalesInvoice_clientId_status_idx" ON "SalesInvoice"("clientId", "status");

-- CreateIndex
CREATE INDEX "SalesInvoice_companyId_dueDate_idx" ON "SalesInvoice"("companyId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_companyId_invoiceNumber_key" ON "SalesInvoice"("companyId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "SalesInvoiceItem_salesInvoiceId_idx" ON "SalesInvoiceItem"("salesInvoiceId");

-- CreateIndex
CREATE INDEX "PaymentIn_companyId_paymentDate_idx" ON "PaymentIn"("companyId", "paymentDate");

-- CreateIndex
CREATE INDEX "PaymentIn_clientId_idx" ON "PaymentIn"("clientId");

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillItem" ADD CONSTRAINT "PurchaseBillItem_purchaseBillId_fkey" FOREIGN KEY ("purchaseBillId") REFERENCES "PurchaseBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillItem" ADD CONSTRAINT "PurchaseBillItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillItem" ADD CONSTRAINT "PurchaseBillItem_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOut" ADD CONSTRAINT "PaymentOut_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOut" ADD CONSTRAINT "PaymentOut_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOut" ADD CONSTRAINT "PaymentOut_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOut" ADD CONSTRAINT "PaymentOut_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOutDetail" ADD CONSTRAINT "PaymentOutDetail_paymentOutId_fkey" FOREIGN KEY ("paymentOutId") REFERENCES "PaymentOut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOutDetail" ADD CONSTRAINT "PaymentOutDetail_purchaseBillId_fkey" FOREIGN KEY ("purchaseBillId") REFERENCES "PurchaseBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_serviceCategoryId_fkey" FOREIGN KEY ("serviceCategoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_serviceCategoryId_fkey" FOREIGN KEY ("serviceCategoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceItem" ADD CONSTRAINT "SalesInvoiceItem_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceItem" ADD CONSTRAINT "SalesInvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceItem" ADD CONSTRAINT "SalesInvoiceItem_serviceCategoryId_fkey" FOREIGN KEY ("serviceCategoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIn" ADD CONSTRAINT "PaymentIn_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIn" ADD CONSTRAINT "PaymentIn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIn" ADD CONSTRAINT "PaymentIn_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIn" ADD CONSTRAINT "PaymentIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInDetail" ADD CONSTRAINT "PaymentInDetail_paymentInId_fkey" FOREIGN KEY ("paymentInId") REFERENCES "PaymentIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInDetail" ADD CONSTRAINT "PaymentInDetail_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
