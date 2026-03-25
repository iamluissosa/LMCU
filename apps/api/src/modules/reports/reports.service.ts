import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ExpensesFilter {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  departmentId?: string;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getUnifiedExpenses(filters: ExpensesFilter) {
    const { startDate, endDate, categoryId, departmentId } = filters;

    // Builds the common where clause
    const whereDates = {};
    if (startDate) {
      whereDates['gte'] = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      whereDates['lte'] = new Date(`${endDate}T23:59:59.999Z`);
    }

    // 1. Fetch PurchaseBillItems (Regular Invoice Expenses)
    const billItemsWhere: any = {};
    if (categoryId) billItemsWhere.expenseCategoryId = categoryId;
    if (departmentId) billItemsWhere.departmentId = departmentId;
    
    // We filter by bill date if standard filters exist
    if (Object.keys(whereDates).length > 0) {
      billItemsWhere.purchaseBill = { issueDate: whereDates };
    }

    const billItems = await this.prisma.purchaseBillItem.findMany({
      where: billItemsWhere,
      include: {
        purchaseBill: {
          include: { supplier: true }
        },
        expenseCategory: true,
        department: true,
      },
      orderBy: { purchaseBill: { issueDate: 'desc' } }
    });

    // 2. Fetch PaymentOutExpenseItems (Direct Expenses)
    const directItemsWhere: any = {};
    if (categoryId) directItemsWhere.expenseCategoryId = categoryId;
    if (departmentId) directItemsWhere.departmentId = departmentId;
    
    if (Object.keys(whereDates).length > 0) {
      directItemsWhere.paymentOut = { paymentDate: whereDates };
    }

    const directItems = await this.prisma.paymentOutExpenseItem.findMany({
      where: directItemsWhere,
      include: {
        paymentOut: true,
        expenseCategory: true,
        department: true,
      },
      orderBy: { paymentOut: { paymentDate: 'desc' } }
    });

    // 3. Unify the results mapping them to a common structure
    const unifiedRows: any[] = [];

    // Map Bill Items
    for (const item of billItems) {
      const bill = item.purchaseBill;
      // Calculate equivalent USD for bill items based on currency & exchange rate
      // Assuming item.unitPrice is in the bill's currency
      const amountLocal = Number(item.unitPrice) * Number(item.quantity);
      let amountUSD = 0;
      let amountVES = 0;

      if (bill.currencyCode === 'USD') {
        amountUSD = amountLocal;
        amountVES = amountLocal * Number(bill.exchangeRate || 1);
      } else if (bill.currencyCode === 'EUR') {
        // As standard approximation, we would use an EUR to USD equivalence if available, 
        // Or if Exchange rate is stored as VES equivalent, we can do VES -> USD
        // Here we just map accurately according to its currency
        amountUSD = amountLocal; // Or a conversion rule
        amountVES = amountLocal * Number(bill.exchangeRate || 1);
      } else {
        // Bs
        amountVES = amountLocal;
        amountUSD = amountLocal / Number(bill.exchangeRate || 1);
      }

      unifiedRows.push({
        id: `bill-${item.id}`,
        type: 'INVOICE',
        date: bill.issueDate,
        reference: bill.invoiceNumber || bill.controlNumber || `INT-${bill.id}`,
        entityName: bill.supplier?.name || bill.supplier?.contactName || 'Desconocido',
        description: item.description,
        categoryId: item.expenseCategoryId,
        categoryName: item.expenseCategory?.name || 'SD',
        departmentId: item.departmentId,
        departmentName: item.department?.name || 'General',
        currencyCode: bill.currencyCode,
        exchangeRate: Number(bill.exchangeRate || 1),
        originalAmount: amountLocal,
        amountUSD,
        amountVES,
      });
    }

    // Map Direct Expense Items
    for (const item of directItems) {
      const pay = item.paymentOut;
      const amountLocal = Number(item.amount);
      
      let amountUSD = 0;
      let amountVES = 0;

      if (pay.currencyCode === 'USD') {
        amountUSD = amountLocal;
        amountVES = amountLocal * Number(pay.exchangeRate || 1);
      } else if (pay.currencyCode === 'EUR') {
        amountUSD = amountLocal; 
        amountVES = amountLocal * Number(pay.exchangeRate || 1);
      } else {
        amountVES = amountLocal;
        amountUSD = amountLocal / Number(pay.exchangeRate || 1);
      }

      unifiedRows.push({
        id: `direct-${item.id}`,
        type: 'DIRECT_EXPENSE',
        date: pay.paymentDate,
        reference: pay.reference || 'S/R',
        entityName: pay.bankName || 'Caja Chica', // Or whatever makes sense for Direct
        description: item.description || pay.notes || 'Gasto no documentado',
        categoryId: item.expenseCategoryId,
        categoryName: item.expenseCategory?.name || 'SD',
        departmentId: item.departmentId,
        departmentName: item.department?.name || 'General',
        currencyCode: pay.currencyCode,
        exchangeRate: Number(pay.exchangeRate || 1),
        originalAmount: amountLocal,
        amountUSD,
        amountVES,
      });
    }

    // Sort unified rows by date descending
    unifiedRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return unifiedRows;
  }
}
