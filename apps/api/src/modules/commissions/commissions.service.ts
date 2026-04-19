import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommissionRuleDto } from './dto/commission.dto';
import { CommissionLedgerType } from '@prisma/client';

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(companyId: string, dto: CreateCommissionRuleDto) {
    return this.prisma.commissionRule.create({
      data: {
        companyId,
        name: dto.name,
        type: dto.type,
        rate: dto.rate,
        fixedAmount: dto.fixedAmount,
        salespersonId: dto.salespersonId || null,
        productId: dto.productId || null,
        isActive: dto.isActive ?? true,
        priority: dto.priority ?? 0,
      },
    });
  }

  async loadActiveRules(companyId: string, salespersonId?: string, productId?: string) {
    return this.prisma.commissionRule.findMany({
      where: {
        companyId,
        isActive: true,
        OR: [
          { salespersonId: null, productId: null },
          { salespersonId, productId: null },
          { salespersonId: null, productId },
          { salespersonId, productId },
        ],
      },
      orderBy: { priority: 'desc' },
    });
  }

  async getRules(companyId: string) {
    return this.prisma.commissionRule.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        salesperson: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async deactivateRule(companyId: string, id: string) {
    const rule = await this.prisma.commissionRule.findFirst({
      where: { id, companyId },
    });
    if (!rule) throw new NotFoundException('Regla no encontrada');

    return this.prisma.commissionRule.update({
      where: { id },
      data: {
        isActive: false,
        effectiveTo: new Date(),
      },
    });
  }

  async getLedger(companyId: string, params: {
    salespersonId?: string;
    fiscalMonth?: number;
    fiscalYear?: number;
  }) {
    const where: any = { companyId };
    
    if (params.salespersonId) where.salespersonId = params.salespersonId;
    if (params.fiscalMonth) where.fiscalMonth = Number(params.fiscalMonth);
    if (params.fiscalYear) where.fiscalYear = Number(params.fiscalYear);

    return this.prisma.commissionLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        salesperson: { select: { id: true, name: true } },
        rule: { select: { name: true, type: true } },
        salesInvoice: { select: { invoiceNumber: true } },
      },
    });
  }

  async getSummary(companyId: string, salespersonId: string) {
    const earnedGroup = await this.prisma.commissionLedger.groupBy({
      by: ['type'],
      where: { companyId, salespersonId },
      _sum: { amount: true },
    });

    let earned = 0;
    let clawback = 0;
    let payment = 0;

    earnedGroup.forEach((g) => {
      if (g.type === CommissionLedgerType.EARNED) earned += Number(g._sum.amount || 0);
      if (g.type === CommissionLedgerType.CLAWBACK) clawback += Number(g._sum.amount || 0);
      if (g.type === CommissionLedgerType.ADJUSTMENT) payment += Number(g._sum.amount || 0); // Ajustes negativos (pagos)
    });

    return {
      earned,
      clawback,
      payment,
      netTotal: earned + clawback + payment, 
    };
  }

  async payCommissions(companyId: string, userId: string, data: {
    salespersonId: string;
    amount: number;
    method: string;
    reference?: string;
    bankName?: string;
    currencyCode?: string;
    exchangeRate?: number;
    notes?: string;
    expenseCategoryId?: string;
  }) {
    if (data.amount <= 0) {
      throw new BadRequestException('El monto a pagar debe ser mayor a 0');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener secuencias EGR
      let settings = await tx.companySettings.findUnique({
        where: { companyId },
      });
      if (!settings) {
         throw new BadRequestException('Configuración de empresa no encontrada.');
      }
      const paymentNumber = `EGR-COM-${settings.fiscalYear}-${String(settings.nextPaymentOutNumber ?? 1).padStart(6, '0')}`;
      
      await tx.companySettings.update({
        where: { companyId },
        data: { nextPaymentOutNumber: settings.nextPaymentOutNumber + 1 },
      });

      // 2. Crear PaymentOut (como gasto directo)
      const paymentOut = await tx.paymentOut.create({
        data: {
          companyId,
          paymentNumber,
          paymentDate: new Date(),
          method: data.method as any,
          reference: data.reference,
          bankName: data.bankName,
          currencyCode: data.currencyCode ?? 'USD',
          exchangeRate: data.exchangeRate || 1,
          amountPaid: data.amount,
          notes: data.notes || `Pago de Comisiones a vendedor`,
          isDirectExpense: true,
          createdById: userId,
          ...(data.expenseCategoryId ? {
             expenseItems: {
                create: [{
                   expenseCategoryId: data.expenseCategoryId,
                   description: 'Pago de comisiones de ventas',
                   amount: data.amount
                }]
             }
          } : {})
        }
      });

      // 3. Crear CommissionLedger deductivo (ADJUSTMENT)
      const rule = await tx.commissionRule.findFirst({ where: { companyId } }); // Solo para referencia, el ledger pide una rule obligatoria, usamos cualquiera, o lo mejor seria hacer ruleId opcional en el schema
      // Ya que ruleId es obligatorio en schema para CommissionLedger, buscamos la primera regla como fallback, esto asume que siempre hay al menos 1 regla.
      if (!rule) {
         throw new BadRequestException('Debe existir al menos una regla de comisión para registrar pagos.');
      }

      await tx.commissionLedger.create({
        data: {
          companyId,
          salespersonId: data.salespersonId,
          ruleId: rule.id,  // Hack necesario por restricción on schema
          salesInvoiceId: null, // Change from 'N/A' to null
          type: CommissionLedgerType.ADJUSTMENT,
          baseAmount: 0,
          rate: 0,
          amount: -data.amount, // Deducción!
          currencyCode: data.currencyCode ?? 'USD',
          exchangeRate: data.exchangeRate || 1,
          description: `Pago procesado vía Egreso ${paymentNumber}`,
          fiscalMonth: new Date().getMonth() + 1,
          fiscalYear: new Date().getFullYear(),
        }
      });

      return paymentOut;
    });
  }
}

