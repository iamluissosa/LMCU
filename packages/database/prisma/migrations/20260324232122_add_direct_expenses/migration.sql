-- AlterTable
ALTER TABLE "PaymentOut" ADD COLUMN     "isDirectExpense" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PaymentOutExpenseItem" (
    "id" TEXT NOT NULL,
    "paymentOutId" TEXT NOT NULL,
    "expenseCategoryId" TEXT,
    "departmentId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PaymentOutExpenseItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentOutExpenseItem" ADD CONSTRAINT "PaymentOutExpenseItem_paymentOutId_fkey" FOREIGN KEY ("paymentOutId") REFERENCES "PaymentOut"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOutExpenseItem" ADD CONSTRAINT "PaymentOutExpenseItem_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOutExpenseItem" ADD CONSTRAINT "PaymentOutExpenseItem_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
