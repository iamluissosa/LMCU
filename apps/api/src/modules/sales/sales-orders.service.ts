import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSalesOrderDto,
  UpdateSalesOrderStatusDto,
} from './dto/sales-order.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalesOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // CREAR PEDIDO (Venta directa SIN cotización previa)
  // ------------------------------------------------------------------
  async create(companyId: string, userId: string, dto: CreateSalesOrderDto) {
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
            nextSalesOrderNumber: 1,
          },
        });
      }

      const fiscalYear = (settings as any).fiscalYear ?? new Date().getFullYear();
      const orderNumber = `PV-${fiscalYear}-${String((settings as any).nextSalesOrderNumber ?? 1).padStart(4, '0')}`;
      await tx.companySettings.update({
        where: { companyId },
        data: { nextSalesOrderNumber: (settings as any).nextSalesOrderNumber + 1 } as any,
      });

      // 2. Validar y comprometer stock SOLO para productos físicos
      for (const item of dto.items) {
        if (item.productId) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (!product || product.companyId !== companyId) {
            throw new BadRequestException(
              `Producto ${item.productId} no válido.`,
            );
          }

          if (!product.isService) {
            if (Number(product.currentStock) < item.quantity) {
              throw new BadRequestException(
                `Stock insuficiente para "${product.name}". Disponible: ${product.currentStock}, Requerido: ${item.quantity}`,
              );
            }
            await tx.product.update({
              where: { id: item.productId },
              data: { currentStock: { decrement: item.quantity } },
            });
          }
        }
      }

      // 3. Calcular totales
      const {
        subtotal,
        exemptAmount,
        taxableAmount,
        taxAmount,
        totalAmount,
        itemsData,
      } = this.calculateTotals(dto.items);

      // 4. Crear pedido
      const order = await tx.salesOrder.create({
        data: {
          companyId,
          clientId: dto.clientId,
          orderNumber,
          currencyCode: dto.currencyCode ?? 'USD',
          exchangeRate: new Decimal(dto.exchangeRate ?? 1),
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
          deliveryAddress: dto.deliveryAddress,
          subtotal: new Decimal(subtotal),
          exemptAmount: new Decimal(exemptAmount),
          taxableAmount: new Decimal(taxableAmount),
          taxAmount: new Decimal(taxAmount),
          totalAmount: new Decimal(totalAmount),
          notes: dto.notes,
          internalNote: dto.internalNote,
          createdById: userId,
          items: { create: itemsData },
        },
        include: {
          client: { select: { id: true, name: true, rif: true } },
          items: {
            include: {
              product: {
                select: { id: true, name: true, code: true, isService: true },
              },
              serviceCategory: true,
            },
          },
        },
      });

      // 5. Si viene de una cotización, vincularla
      if (dto.quoteId) {
        await tx.quote.update({
          where: { id: dto.quoteId },
          data: { status: 'ACCEPTED', salesOrderId: order.id },
        });
      }

      return order;
    });
  }

  // ------------------------------------------------------------------
  // LISTAR PEDIDOS
  // ------------------------------------------------------------------
  async findAll(companyId: string, params: { page?: number; status?: string }) {
    const page = Number(params.page ?? 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  // ------------------------------------------------------------------
  // OBTENER UNO
  // ------------------------------------------------------------------
  async findOne(companyId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        items: { include: { product: true, serviceCategory: true } },
        salesInvoices: {
          select: { id: true, invoiceNumber: true, status: true },
        },
        quotesLinked: { select: { id: true, quoteNumber: true } },
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
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    return order;
  }

  // ------------------------------------------------------------------
  // ACTUALIZAR ESTADO
  // ------------------------------------------------------------------
  async updateStatus(
    companyId: string,
    id: string,
    dto: UpdateSalesOrderStatusDto,
  ) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado.');

    // Al cancelar: reponer stock de productos físicos
    if (dto.status === 'CANCELLED' && order.status !== 'CANCELLED') {
      const items = await this.prisma.salesOrderItem.findMany({
        where: { salesOrderId: id },
        include: { product: true },
      });
      for (const item of items) {
        if (item.productId && item.product && !item.product.isService) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: Number(item.quantity) } },
          });
        }
      }
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: dto.status as any },
    });
  }

  // ------------------------------------------------------------------
  // PIPELINE: resumen agrupado por estado para Dashboard
  // ------------------------------------------------------------------
  async getPipeline(companyId: string) {
    const grouped = await this.prisma.salesOrder.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { id: true },
      _sum: { totalAmount: true },
    });
    return grouped.map((g) => ({
      status: g.status,
      count: g._count.id,
      total: g._sum.totalAmount ?? 0,
    }));
  }

  // ------------------------------------------------------------------
  // HELPER: CALCULAR TOTALES
  // ------------------------------------------------------------------
  private calculateTotals(items: CreateSalesOrderDto['items']) {
    let subtotal = 0,
      exemptAmount = 0,
      taxableAmount = 0,
      taxAmount = 0;

    const itemsData = items.map((i) => {
      const rate = i.taxRate ?? 16;
      const disc = i.discount ?? 0;
      const base = i.quantity * i.unitPrice * (1 - disc / 100);
      const tax = base * (rate / 100);

      subtotal += base;
      if (rate === 0) exemptAmount += base;
      else {
        taxableAmount += base;
        taxAmount += tax;
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
      totalAmount: subtotal + taxAmount,
      itemsData,
    };
  }
}
