import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSalesInvoiceDto,
  RegisterPaymentInDto,
} from './dto/sales-invoice.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalesInvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // CREAR FACTURA DE VENTA (desde Pedido o directa)
  // ------------------------------------------------------------------
  async create(companyId: string, userId: string, dto: CreateSalesInvoiceDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener o crear configuración de empresa
      let settings = await tx.companySettings.findUnique({
        where: { companyId },
      });
      if (!settings) {
        settings = await tx.companySettings.create({
          data: { 
            companyId,
            fiscalYear: new Date().getFullYear(),
            nextSalesInvoiceNumber: 1,
            invoicePrefix: 'F',
          },
        });
      }

      const invoiceNumber = `${(settings as any).invoicePrefix ?? 'F'}${String((settings as any).nextSalesInvoiceNumber ?? (settings as any).nextInvoiceNumber ?? 1).padStart(4, '0')}`;
      await tx.companySettings.update({
        where: { companyId },
        data: { nextSalesInvoiceNumber: (settings as any).nextSalesInvoiceNumber + 1 } as any,
      });

      // 2. Cargar datos del cliente (para calcular retenciones)
      const client = await tx.client.findUnique({
        where: { id: dto.clientId },
      });
      if (!client || client.companyId !== companyId) {
        throw new BadRequestException('Cliente no válido.');
      }

      // 3. Calcular totales de ítems (incluyendo alícuotas segregadas SENIAT)
      const {
        subtotal,
        exemptAmount,
        taxableAmount,
        taxAmount,
        taxableAmount16,
        taxAmount16,
        taxableAmount8,
        taxAmount8,
        taxableAmount31,
        taxAmount31,
        totalAmount,
        itemsData,
      } = this.calculateTotals(dto.items);

      // Período fiscal automático desde la fecha de emisión
      const issueDateObj = dto.issueDate ? new Date(dto.issueDate) : new Date();
      const fiscalMonth = dto.fiscalMonth ?? (issueDateObj.getMonth() + 1);
      const fiscalYear  = dto.fiscalYear  ?? issueDateObj.getFullYear();

      // 4. Calcular RETENCIONES según las reglas SENIAT
      // Retención IVA: solo si el cliente es agente de retención
      const retIvaRate = dto.retIvaRate ?? (client.isIvaAgent ? 75 : 0);
      const retentionIVA = taxAmount * (retIvaRate / 100);

      // Retención ISLR: viene del client.islrRate (configurado en el perfil del cliente)
      const retISLRRate = dto.retISLRRate ?? Number(client.islrRate ?? 0);
      const retentionISLR = taxableAmount * (retISLRRate / 100);

      // IGTF: 3% sobre el neto a cobrar, SOLO si paga en efectivo USD (se define al cobrar)
      // Al emitir la factura, solo marcamos si aplica; el monto se calcula al registrar el cobro
      const igtfApplies = dto.igtfApplies ?? false;

      // Neto a cobrar = total - retIVA - retISLR (el IGTF lo suma el cliente encima)
      // Este cálculo es informativo; paidAmount se actualiza con PaymentIn

      // 5. Calcular dueDate desde paymentTerms del cliente
      const dueDate = dto.dueDate
        ? new Date(dto.dueDate)
        : client.paymentTerms > 0
          ? new Date(Date.now() + client.paymentTerms * 86400000)
          : null;

      // 6. Crear factura
      const invoice = await tx.salesInvoice.create({
        data: {
          companyId,
          clientId: dto.clientId,
          salesOrderId: dto.salesOrderId ?? null,
          invoiceNumber,
          controlNumber: dto.controlNumber,
          currencyCode: dto.currencyCode ?? 'USD',
          exchangeRate: new Decimal(dto.exchangeRate ?? 1),
          issueDate: issueDateObj,
          dueDate,
          // ── Período fiscal SENIAT ──────────────────────
          fiscalMonth,
          fiscalYear,
          // ── Desglose fiscal total ──────────────────────
          subtotal: new Decimal(subtotal),
          exemptAmount: new Decimal(exemptAmount),
          taxableAmount: new Decimal(taxableAmount),
          taxAmount: new Decimal(taxAmount),
          totalAmount: new Decimal(totalAmount),
          // ── Alícuotas segregadas SENIAT ────────────────
          taxableAmount16: new Decimal(taxableAmount16),
          taxAmount16: new Decimal(taxAmount16),
          taxableAmount8: new Decimal(taxableAmount8),
          taxAmount8: new Decimal(taxAmount8),
          taxableAmount31: new Decimal(taxableAmount31),
          taxAmount31: new Decimal(taxAmount31),
          // ── Retenciones (SENIAT) ───────────────────────
          retIvaRate: new Decimal(retIvaRate),
          retentionIVA: new Decimal(retentionIVA),
          retISLRRate: new Decimal(retISLRRate),
          retentionISLR: new Decimal(retentionISLR),
          // ── IGTF ──────────────────────────────────────
          igtfApplies,
          igtfRate: new Decimal(3),
          // ── Metadatos ─────────────────────────────────
          inBook: dto.inBook ?? true,
          notes: dto.notes,
          status: 'ISSUED',
          createdById: userId,
          items: { create: itemsData },
        },
        include: {
          client: {
            select: { id: true, name: true, rif: true, isIvaAgent: true },
          },
          items: {
            include: {
              product: { select: { id: true, name: true, code: true } },
              serviceCategory: true,
            },
          },
        },
      });

      // 7. Si viene de un pedido, actualizar su estado a INVOICED
      if (dto.salesOrderId) {
        await tx.salesOrder.update({
          where: { id: dto.salesOrderId },
          data: { status: 'INVOICED' },
        });
      }

      return invoice;
    });
  }

  // ------------------------------------------------------------------
  // LISTAR FACTURAS
  // ------------------------------------------------------------------
  async findAll(
    companyId: string,
    params: { page?: number; status?: string; clientId?: string },
  ) {
    const page = Number(params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params.status) where.status = params.status;
    if (params.clientId) where.clientId = params.clientId;

    const [items, total] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          _count: { select: { payments: true } },
        },
      }),
      this.prisma.salesInvoice.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  // ------------------------------------------------------------------
  // OBTENER UNA FACTURA
  // ------------------------------------------------------------------
  async findOne(companyId: string, id: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        salesOrder: { select: { id: true, orderNumber: true } },
        items: { include: { product: true, serviceCategory: true } },
        payments: {
          include: {
            paymentIn: {
              select: {
                id: true,
                paymentNumber: true,
                paymentDate: true,
                method: true,
              },
            },
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada.');
    return invoice;
  }

  // ------------------------------------------------------------------
  // REGISTRAR COBRO (PaymentIn)
  // ------------------------------------------------------------------
  async registerPayment(
    companyId: string,
    userId: string,
    dto: RegisterPaymentInDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener o crear configuración de empresa
      let settings = await tx.companySettings.findUnique({
        where: { companyId },
      });
      if (!settings) {
        settings = await tx.companySettings.create({
          data: { 
            companyId,
            fiscalYear: new Date().getFullYear(),
            nextPaymentInNumber: 1,
          },
        });
      }

      const fiscalYear = (settings as any).fiscalYear ?? new Date().getFullYear();
      const paymentNumber = `COB-${fiscalYear}-${String((settings as any).nextPaymentInNumber ?? 1).padStart(4, '0')}`;
      await tx.companySettings.update({
        where: { companyId },
        data: { nextPaymentInNumber: (settings as any).nextPaymentInNumber + 1 },
      });

      // 2. Calcular IGTF si aplica (método CASH_USD → 3%)
      const igtfAmount =
        dto.method === 'CASH_USD'
          ? (dto.igtfAmount ?? dto.amountReceived * 0.03)
          : 0;

      // 3. Crear el PaymentIn
      const payment = await tx.paymentIn.create({
        data: {
          companyId,
          clientId: dto.clientId,
          paymentNumber,
          method: dto.method as any,
          reference: dto.reference,
          bankName: dto.bankName,
          currencyCode: dto.currencyCode ?? 'USD',
          exchangeRate: new Decimal(dto.exchangeRate ?? 1),
          amountReceived: new Decimal(dto.amountReceived),
          igtfAmount: new Decimal(igtfAmount),
          notes: dto.notes,
          createdById: userId,
          details: {
            create: dto.details.map((d) => ({
              salesInvoiceId: d.salesInvoiceId,
              amountApplied: new Decimal(d.amountApplied),
            })),
          },
        },
      });

      // 4. Actualizar paidAmount + status en cada factura cubierta
      for (const detail of dto.details) {
        const invoice = await tx.salesInvoice.findUnique({
          where: { id: detail.salesInvoiceId },
        });
        if (!invoice || invoice.companyId !== companyId) {
          throw new BadRequestException(
            `Factura ${detail.salesInvoiceId} no válida.`,
          );
        }

        const newPaid = Number(invoice.paidAmount) + detail.amountApplied;
        const total = Number(invoice.totalAmount);
        const newStatus = newPaid >= total ? 'PAID' : 'PARTIAL';

        await tx.salesInvoice.update({
          where: { id: detail.salesInvoiceId },
          data: {
            paidAmount: new Decimal(newPaid),
            status: newStatus as any,
          },
        });
      }

      return payment;
    });
  }

  // ------------------------------------------------------------------
  // FACTURAS VENCIDAS (para job nocturno o endpoint de alertas)
  // ------------------------------------------------------------------
  async getOverdue(companyId: string) {
    return this.prisma.salesInvoice.findMany({
      where: {
        companyId,
        status: { in: ['ISSUED', 'PARTIAL'] },
        dueDate: { lt: new Date() },
      },
      include: { client: { select: { id: true, name: true, email: true } } },
      orderBy: { dueDate: 'asc' },
    });
  }

  // ------------------------------------------------------------------
  // LIBRO DE VENTAS (agrupado por mes para SENIAT)
  // ------------------------------------------------------------------
  async getSalesBook(companyId: string, year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59);

    return this.prisma.salesInvoice.findMany({
      where: {
        companyId,
        inBook: true,
        issueDate: { gte: from, lte: to },
        status: { not: 'VOID' },
      },
      include: {
        client: { select: { name: true, rif: true, taxpayerType: true } },
      },
      orderBy: { issueDate: 'asc' },
    });
  }

  // ------------------------------------------------------------------
  // HELPER: CALCULAR TOTALES FISCALES (con alícuotas segregadas SENIAT)
  // ------------------------------------------------------------------
  private calculateTotals(items: CreateSalesInvoiceDto['items']) {
    let subtotal = 0,
      exemptAmount = 0,
      taxableAmount = 0,
      taxAmount = 0,
      taxableAmount16 = 0,
      taxAmount16 = 0,
      taxableAmount8 = 0,
      taxAmount8 = 0,
      taxableAmount31 = 0,
      taxAmount31 = 0;

    const itemsData = items.map((i) => {
      const rate = i.taxRate ?? 16;
      const disc = i.discount ?? 0;
      const base = i.quantity * i.unitPrice * (1 - disc / 100);
      const tax = base * (rate / 100);

      subtotal += base;
      if (rate === 0) {
        exemptAmount += base;
      } else {
        taxableAmount += base;
        taxAmount += tax;
        // Segregar por alícuota para el SENIAT
        if (rate === 16) { taxableAmount16 += base; taxAmount16 += tax; }
        else if (rate === 8) { taxableAmount8 += base; taxAmount8 += tax; }
        else if (rate === 31) { taxableAmount31 += base; taxAmount31 += tax; }
      }

      return {
        productId: i.productId ?? null,
        serviceCategoryId: (i as any).serviceCategoryId ?? null,
        description: i.description ?? null,
        quantity: new Decimal(i.quantity),
        unitPrice: new Decimal(i.unitPrice),
        taxRate: new Decimal(rate),
        discount: new Decimal(disc),
        totalLine: new Decimal(base + tax),
      };
    });

    return {
      subtotal,
      exemptAmount,
      taxableAmount,
      taxAmount,
      taxableAmount16,
      taxAmount16,
      taxableAmount8,
      taxAmount8,
      taxableAmount31,
      taxAmount31,
      totalAmount: subtotal + taxAmount,
      itemsData,
    };
  }
}
