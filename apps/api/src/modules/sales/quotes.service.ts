import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  UpdateQuoteStatusDto,
} from './dto/quote.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // CREAR COTIZACIÓN
  // ------------------------------------------------------------------
  async create(companyId: string, userId: string, dto: CreateQuoteDto) {
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
            nextQuoteNumber: 1,
          },
        });
      }

      // Asumimos nextQuoteNumber en settings (añadir si no existe, ver nota abajo)
      const fiscalYear =
        (settings as any).fiscalYear ?? new Date().getFullYear();
      const quoteNumber = `COT-${fiscalYear}-${String((settings as any).nextQuoteNumber ?? 1).padStart(4, '0')}`;

      // Actualizar correlativo
      await tx.companySettings.update({
        where: { companyId },
        data: { nextQuoteNumber: (settings as any).nextQuoteNumber + 1 },
      });

      // 2. Calcular totales de ítems
      const {
        subtotal,
        exemptAmount,
        taxableAmount,
        taxAmount,
        totalAmount,
        itemsData,
      } = this.calculateTotals(dto.items);

      // 3. Crear cotización con sus ítems
      const quote = await tx.quote.create({
        data: {
          companyId,
          clientId: dto.clientId,
          quoteNumber,
          currencyCode: dto.currencyCode ?? 'USD',
          exchangeRate: new Decimal(dto.exchangeRate ?? 1),
          issueDate: new Date(),
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          subtotal: new Decimal(subtotal),
          exemptAmount: new Decimal(exemptAmount),
          taxableAmount: new Decimal(taxableAmount),
          taxAmount: new Decimal(taxAmount),
          totalAmount: new Decimal(totalAmount),
          notes: dto.notes,
          internalNote: dto.internalNote,
          createdById: userId,
          items: {
            create: itemsData,
          },
        },
        include: {
          client: { select: { id: true, name: true, rif: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, code: true } },
              serviceCategory: { select: { id: true, name: true } },
            },
          },
        },
      });

      return quote;
    });
  }

  // ------------------------------------------------------------------
  // LISTAR COTIZACIONES (con paginación)
  // ------------------------------------------------------------------
  async findAll(companyId: string, params: { page?: number; status?: string }) {
    const page = Number(params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, rif: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.quote.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  // ------------------------------------------------------------------
  // OBTENER UNA COTIZACIÓN
  // ------------------------------------------------------------------
  async findOne(companyId: string, id: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, code: true, isService: true },
            },
            serviceCategory: true,
          },
        },
        company: {
          select: {
            name: true,
            rif: true,
            address: true,
            phone: true,
            email: true,
            logoUrl: true,
            settings: {
              select: { invoicePrefix: true },
            },
          },
        },
      },
    });
    if (!quote) throw new NotFoundException('Cotización no encontrada.');
    return quote;
  }

  // ------------------------------------------------------------------
  // ACTUALIZAR ESTADO
  // ------------------------------------------------------------------
  async updateStatus(companyId: string, id: string, dto: UpdateQuoteStatusDto) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, companyId },
    });
    if (!quote) throw new NotFoundException('Cotización no encontrada.');

    return this.prisma.quote.update({
      where: { id },
      data: { status: dto.status as any },
    });
  }

  // ------------------------------------------------------------------
  // ACTUALIZAR COTIZACIÓN (solo si está en DRAFT)
  // ------------------------------------------------------------------
  async update(companyId: string, id: string, dto: UpdateQuoteDto) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, companyId },
    });
    if (!quote) throw new NotFoundException('Cotización no encontrada.');

    if (quote.status !== 'DRAFT') {
      throw new BadRequestException(
        'Solo las cotizaciones en estado BORRADOR pueden ser editadas.',
      );
    }

    const updateData: any = {};

    if (dto.clientId) updateData.clientId = dto.clientId;
    if (dto.expiresAt) updateData.expiresAt = new Date(dto.expiresAt);
    if (dto.currencyCode) updateData.currencyCode = dto.currencyCode;
    if (dto.exchangeRate)
      updateData.exchangeRate = new Decimal(dto.exchangeRate);
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.internalNote !== undefined)
      updateData.internalNote = dto.internalNote;

    if (dto.items) {
      const {
        subtotal,
        exemptAmount,
        taxableAmount,
        taxAmount,
        totalAmount,
        itemsData,
      } = this.calculateTotals(dto.items);

      return this.prisma.$transaction(async (tx) => {
        await tx.quoteItem.deleteMany({ where: { quoteId: id } });

        updateData.subtotal = new Decimal(subtotal);
        updateData.exemptAmount = new Decimal(exemptAmount);
        updateData.taxableAmount = new Decimal(taxableAmount);
        updateData.taxAmount = new Decimal(taxAmount);
        updateData.totalAmount = new Decimal(totalAmount);

        const updatedQuote = await tx.quote.update({
          where: { id },
          data: updateData,
        });

        await tx.quoteItem.createMany({
          data: itemsData.map((item) => ({
            ...item,
            quoteId: id,
          })),
        });

        return this.findOne(companyId, id);
      });
    }

    return this.prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true, rif: true } },
        items: {
          include: {
            product: {
              select: { id: true, name: true, code: true, isService: true },
            },
            serviceCategory: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // CONVERTIR COTIZACIÓN EN PEDIDO (ACCEPTED)
  // ------------------------------------------------------------------
  async convertToOrder(companyId: string, userId: string, quoteId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, companyId },
      include: { items: { include: { product: true, serviceCategory: true } } },
    });
    if (!quote) throw new NotFoundException('Cotización no encontrada.');
    if (
      quote.status !== 'SENT' &&
      quote.status !== 'DRAFT' &&
      quote.status !== 'ACCEPTED'
    ) {
      throw new BadRequestException(
        `La cotización está en estado ${quote.status}. Solo DRAFT, SENT o ACCEPTED pueden convertirse.`,
      );
    }
    if (quote.salesOrderId) {
      throw new BadRequestException(
        'Esta cotización ya tiene un pedido generado.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Generar número de pedido
      const settings = await tx.companySettings.findUnique({
        where: { companyId },
      });
      const orderNumber = `PV-${settings!.fiscalYear}-${String((settings as any).nextSalesOrderNumber ?? 1).padStart(4, '0')}`;
      await tx.companySettings.update({
        where: { companyId },
        data: { nextSalesOrderNumber: { increment: 1 } } as any,
      });

      // 2. Validar y comprometer stock para productos físicos
      for (const item of quote.items) {
        if (item.productId && item.product && !item.product.isService) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (!product)
            throw new BadRequestException(
              `Producto ${item.productId} no existe.`,
            );

          const stockDisponible = Number(product.currentStock);
          if (stockDisponible < Number(item.quantity)) {
            throw new BadRequestException(
              `Stock insuficiente para "${product.name}". Disponible: ${stockDisponible}, Requerido: ${item.quantity}`,
            );
          }
          // Rebajar stock
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: Number(item.quantity) } },
          });
        }
        // Si isService = true → no se toca el stock (servicios no tienen inventario)
      }

      // 3. Crear SalesOrder copiando ítems de la cotización
      const order = await tx.salesOrder.create({
        data: {
          companyId,
          clientId: quote.clientId,
          orderNumber,
          currencyCode: quote.currencyCode,
          exchangeRate: quote.exchangeRate,
          subtotal: quote.subtotal,
          exemptAmount: quote.exemptAmount,
          taxableAmount: quote.taxableAmount,
          taxAmount: quote.taxAmount,
          totalAmount: quote.totalAmount,
          notes: quote.notes,
          createdById: userId,
          items: {
            create: quote.items.map((i) => ({
              productId: i.productId,
              serviceCategoryId: i.serviceCategoryId,
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              taxRate: i.taxRate,
              discount: i.discount,
              totalLine: i.totalLine,
            })),
          },
        },
      });

      // 4. Vincular cotización al pedido y marcar ACCEPTED
      await tx.quote.update({
        where: { id: quoteId },
        data: { status: 'ACCEPTED', salesOrderId: order.id },
      });

      return order;
    });
  }

  // ------------------------------------------------------------------
  // HELPER: CALCULAR TOTALES
  // ------------------------------------------------------------------
  private calculateTotals(items: CreateQuoteDto['items']) {
    let subtotal = 0;
    let exemptAmount = 0;
    let taxableAmount = 0;
    let taxAmount = 0;

    const itemsData = items.map((i) => {
      const rate = i.taxRate ?? 16;
      const disc = i.discount ?? 0;
      const base = i.quantity * i.unitPrice * (1 - disc / 100);
      const tax = base * (rate / 100);
      const totalLine = base + tax;

      subtotal += base;
      if (rate === 0) {
        exemptAmount += base;
      } else {
        taxableAmount += base;
        taxAmount += tax;
      }

      return {
        productId: i.productId || null,
        serviceCategoryId: (i as any).serviceCategoryId || null,
        description: i.description || null,
        unitOfMeasure: i.unitOfMeasure ?? 'Pza',
        quantity: new Decimal(i.quantity),
        unitPrice: new Decimal(i.unitPrice),
        taxRate: new Decimal(rate),
        discount: new Decimal(disc),
        totalLine: new Decimal(totalLine),
      };
    });

    return {
      subtotal,
      exemptAmount,
      taxableAmount,
      taxAmount,
      totalAmount: subtotal + taxAmount,
      itemsData,
    };
  }
}
