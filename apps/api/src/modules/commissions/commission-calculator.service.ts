import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommissionLedgerType } from '@repo/database';

@Injectable()
export class CommissionCalculatorService {
  private readonly logger = new Logger(CommissionCalculatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateAndRecordCommission(data: {
    companyId: string;
    invoiceId: string;
    paymentId: string;
    amountApplied: number;
    paymentDate: Date;
  }) {
    const { companyId, invoiceId, paymentId, amountApplied, paymentDate } = data;

    // 1. Obtener la factura
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          include: { product: { select: { id: true, costAverage: true } } },
        },
      },
    });

    if (!invoice) return;

    const salespersonId = invoice.salespersonId;
    if (!salespersonId) {
      this.logger.debug(`Factura ${invoice.invoiceNumber} no tiene vendedor asignado. Ignorando comisiones.`);
      return;
    }

    // 1.1 Proporción pagada
    const totalAmount = Number(invoice.totalAmount) || 1; 
    const proportion = amountApplied / totalAmount;

    // 2. Obtener reglas activas aplicables
    const rules = await this.prisma.commissionRule.findMany({
      where: {
        companyId,
        isActive: true,
        OR: [
          { salespersonId: null },
          { salespersonId },
        ],
      },
      orderBy: { priority: 'desc' },
    });

    if (rules.length === 0) return;

    // Tomamos la regla con mayor prioridad que aplique (o la primera si es global)
    // Se puede expandir para permitir multiples reglas si se apilan, por ahora usamos "la ganadora".
    const activeRule = rules[0];

    let calculatedAmount = 0;
    const rate = Number(activeRule.rate);

    // 3. Ejecutar Estrategia de Cálculo sobre el TOTAL de la factura
    switch (activeRule.type) {
      case 'PERCENT_ON_TOTAL': {
        const netToCommission = Number(invoice.subtotal); // Usualmente es sobre subtotal sin IVA (depende de policy)
        calculatedAmount = netToCommission * (rate / 100);
        break;
      }
      
      case 'PERCENT_ON_MARGIN': {
        let totalMargin = 0;
        for (const item of invoice.items) {
          const unitPrice = Number(item.unitPrice);
          const qty = Number(item.quantity);
          const cost = Number(item.product?.costAverage || 0);
          
          const margin = (unitPrice - cost) * qty;
          totalMargin += margin;
        }
        calculatedAmount = totalMargin * (rate / 100);
        break;
      }

      case 'FIXED_PER_PRODUCT': {
        const fixedAmt = Number(activeRule.fixedAmount || 0);
        let totalQty = 0;
        for (const item of invoice.items) {
          totalQty += Number(item.quantity);
        }
        calculatedAmount = totalQty * fixedAmt;
        break;
      }
    }

    // 4. Aplicar proporción pagada (Partial Payments)
    const amountToPayNow = calculatedAmount * proportion;

    if (amountToPayNow <= 0) return;

    // Período fiscal
    const fiscalMonth = paymentDate.getMonth() + 1;
    const fiscalYear = paymentDate.getFullYear();

    // 5. Registrar en Ledger
    await this.prisma.commissionLedger.create({
      data: {
        companyId,
        salespersonId,
        ruleId: activeRule.id,
        salesInvoiceId: invoiceId,
        paymentInId: paymentId,
        type: CommissionLedgerType.EARNED,
        baseAmount: Number(invoice.subtotal),
        rate,
        amount: amountToPayNow,
        currencyCode: invoice.currencyCode,
        exchangeRate: invoice.exchangeRate,
        description: `Pago parcial/completo aplicado. Proporción: ${(proportion * 100).toFixed(2)}%`,
        fiscalMonth,
        fiscalYear,
      },
    });

    this.logger.log(`Comisión generada: ${amountToPayNow} para Invoice ${invoice.invoiceNumber}`);
  }

  async calculateClawback(data: {
    companyId: string;
    invoiceId: string;
    clawbackProportion: number; // 1 = 100% de la comisión ya generada se reversa (ej. void)
    date: Date;
    creditNoteId?: string;
  }) {
    const { companyId, invoiceId, clawbackProportion, date, creditNoteId } = data;

    // Buscar comisiones EARNED pagadas para esta factura
    const ledgers = await this.prisma.commissionLedger.findMany({
      where: {
        companyId,
        salesInvoiceId: invoiceId,
        type: CommissionLedgerType.EARNED, // solo buscar lo que se ha ganado
      },
    });

    if (ledgers.length === 0) return;

    const fiscalMonth = date.getMonth() + 1;
    const fiscalYear = date.getFullYear();

    for (const ledger of ledgers) {
      const amountToReverse = Number(ledger.amount) * clawbackProportion;
      if (amountToReverse <= 0) continue;

      await this.prisma.commissionLedger.create({
        data: {
          companyId,
          salespersonId: ledger.salespersonId,
          ruleId: ledger.ruleId,
          salesInvoiceId: invoiceId,
          creditNoteId,
          type: CommissionLedgerType.CLAWBACK,
          baseAmount: ledger.baseAmount,
          rate: ledger.rate,
          amount: -amountToReverse, // negativo
          currencyCode: ledger.currencyCode,
          exchangeRate: ledger.exchangeRate,
          description: `Reverso (Clawback) por devolución/anulación.`,
          fiscalMonth,
          fiscalYear,
        },
      });
    }

    this.logger.log(`Clawback aplicado para Invoice ${invoiceId}`);
  }
}
