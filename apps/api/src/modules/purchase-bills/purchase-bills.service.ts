import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseBillsRepository } from './purchase-bills.repository';
import { CreatePurchaseBillDto } from './dto/create-purchase-bill.dto';
import { CreateDirectPurchaseDto } from './dto/create-direct-purchase.dto';
import { PurchaseBill } from '@erp/types';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { IslrService } from '../islr/islr.service';

@Injectable()
export class PurchaseBillsService {
  constructor(
    private prisma: PrismaService,
    private billsRepository: PurchaseBillsRepository,
    private islrService: IslrService,
  ) {}

  // REGISTRAR FACTURA (I/R)
  async create(
    companyId: string,
    userId: string,
    data: CreatePurchaseBillDto,
  ): Promise<PurchaseBill> {
    const {
      supplierId,
      purchaseOrderId,
      invoiceNumber,
      controlNumber,
      issueDate,
      items,
      islrConceptId,
    } = data;

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          // 1. Validar la Orden de Compra (PO)
          const po = await tx.purchaseOrder.findUnique({
            where: { id: purchaseOrderId },
            include: { items: true }, // Traemos los items para ver cuánto se ha recibido
          });

          if (!po || po.companyId !== companyId) {
            throw new BadRequestException('Orden de compra no válida.');
          }

          // 1.1 Actualizar Estatus de la Orden a BILLED
          await tx.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: 'BILLED' }, // Nuevo estatus
          });

          // 2. Calcular Totales y VALIDAR MATCH (El corazón del sistema)
          let calculatedSubtotal = 0;

          for (const billItem of items) {
            const qtyBilled = Number(billItem.quantity);
            const priceBilled = Number(billItem.unitPrice);

            // A. Buscar el item en la PO original
            const poItem = po.items.find(
              (i) => i.productId === billItem.productId,
            );

            if (!poItem) {
              // Opcional: Permitir items extra (gastos de envío, etc), pero por ahora bloqueamos
              throw new BadRequestException(
                `El producto ${billItem.productName || 'Desconocido'} no pertenece a esta Orden.`,
              );
            }

            // B. THREE-WAY MATCH: ¿Lo facturado excede lo recibido?
            // Nota: En un sistema v2, deberíamos restar lo que YA se facturó anteriormente.
            // Por ahora validamos contra el total recibido acumulado.
            const qtyReceived = Number(poItem.quantityReceived);

            if (qtyBilled > qtyReceived) {
              throw new BadRequestException(
                `Error en ${billItem.productName}: Intentas pagar ${qtyBilled} pero solo han entrado ${qtyReceived} al almacén.`,
              );
            }

            calculatedSubtotal += qtyBilled * priceBilled;
          }

          // 2.5 CALCULAR ISLR SI APLICA
          let islrCalc: { taxableBase: number; percentage: number; sustraendo: number; retainedAmount: number; } | null = null;
          if (islrConceptId) {
            islrCalc = await this.islrService.calculateRetention({
              taxableBase: data.taxableAmount || calculatedSubtotal, 
              conceptId: islrConceptId,
              supplierId: supplierId,
              companyId: companyId
            });
          }

          // 3. Crear la Factura
          const bill = await this.billsRepository.create(
            companyId,
            userId,
            {
              companyId,
              supplierId,
              purchaseOrderId,
              invoiceNumber,
              controlNumber,
              issueDate: new Date(issueDate),
              status: 'UNPAID', // Nace como cuenta por pagar
              retentionISLR: islrCalc?.retainedAmount || 0,
              rateRetISLR: islrCalc?.percentage || 0,
              totalAmount: data.totalAmount || calculatedSubtotal,
              taxableAmount: data.taxableAmount || 0,
              taxAmount: data.taxAmount || 0,
              exchangeRate: data.exchangeRate || 1,
              currencyCode: 'USD',
              items: {
                create: items.map((i) => ({
                  productId: i.productId,
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                  taxRate: i.taxRate || 0,
                  islrRate: i.islrRate || 0,
                  totalLine: i.totalLine || i.quantity * i.unitPrice,
                })),
              },
            } as any,
            tx,
          ); // Pasamos tx para evitar deadlock

          // 4. REGISTRAR EL HISTÓRICO ISLR SI HUBIERE RETENCIÓN
          if (islrCalc && islrCalc.retainedAmount > 0) {
            const controlNumberGen = `ISLR-${companyId.substring(0,4).toUpperCase()}-${Date.now()}`;
            
            await tx.islrRetention.create({
              data: {
                companyId,
                supplierId,
                conceptId: islrConceptId!,
                controlNumber: controlNumberGen,
                totalInvoice: data.totalAmount || calculatedSubtotal,
                taxableBase: islrCalc.taxableBase,
                percentage: islrCalc.percentage,
                sustraendo: islrCalc.sustraendo,
                retainedAmount: islrCalc.retainedAmount,
                retentionDate: new Date()
              }
            });
          }

          return bill;
        },
        {
          maxWait: 5000, // default: 2000
          timeout: 20000, // default: 5000
        },
      );

      return result as unknown as PurchaseBill;
    } catch (error: any) {
      console.error('Error creating purchase bill:', error);
      throw new BadRequestException(
        error.message || 'Error desconocido al crear la factura',
      );
    }
  }

  // Listar Facturas con paginación
  async findAll(
    companyId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20 } = pagination;

    if (!this.prisma.purchaseBill) {
      throw new BadRequestException(
        'Prisma Client out of sync (PurchaseBill model missing). Restart/Regenerate.',
      );
    }

    try {
      return await this.billsRepository.findAll(companyId, page, limit);
    } catch (error: any) {
      console.error('Error fetching purchase bills:', error);
      throw new BadRequestException(`Error fetching bills: ${error.message}`);
    }
  }

  // Eliminar Factura (Solo si es UNPAID y pertenece a la empresa)
  async remove(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<PurchaseBill> {
    const bill = await this.prisma.purchaseBill.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException('Factura no encontrada');

    if (bill.companyId !== companyId) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar esta factura',
      );
    }

    if (bill.status !== 'UNPAID') {
      throw new BadRequestException(
        'Solo se pueden eliminar facturas en estado UNPAID',
      );
    }

    // Al eliminar la factura, deberíamos (idealmente) revertir la recepción si fue un error,
    // pero como no tracking quantityReceived decrement, asumimos que solo borra el registro financiero.
    // Si queremos ser estrictos con el 3-way match, esto es complejo.
    // Por ahora, borramos la factura y sus items (cascade si esta configurado, sino manual).

    try {
      const deleted = await this.billsRepository.remove(id, userId);

      // S-08: Revertir estado de la Orden de Compra si ya no tiene facturas
      if (deleted.purchaseOrderId) {
        const remainingBills = await this.billsRepository.countByOrderId(
          deleted.purchaseOrderId,
        );

        if (remainingBills === 0) {
          // Si no quedan facturas, la orden vuelve a estar disponible para facturar (RECEIVED)
          await this.prisma.purchaseOrder.update({
            where: { id: deleted.purchaseOrderId },
            data: { status: 'RECEIVED' },
          });
        }
      }

      return deleted as unknown as PurchaseBill;
    } catch (error: any) {
      console.error('Error removing purchase bill:', error);
      throw new BadRequestException(
        error.message || 'Error al eliminar la factura',
      );
    }
  }

  // ---------------------------------------------------------
  // ANULAR FACTURA (VOID) — Cumple Prov. 0071 Art. 22 SENIAT
  // La factura queda en el Libro de Compras con montos en 0.00
  // ---------------------------------------------------------
  async voidBill(
    companyId: string,
    userId: string,
    id: string,
    reason: string,
  ): Promise<any> {
    const bill = await this.prisma.purchaseBill.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException('Factura no encontrada');
    if (bill.companyId !== companyId) {
      throw new ForbiddenException('No tienes permiso para anular esta factura');
    }
    if ((bill.status as string) === 'VOID') {
      throw new BadRequestException('La factura ya fue anulada');
    }
    if ((bill.status as string) === 'PAID') {
      throw new BadRequestException(
        'No se puede anular una factura ya pagada. Emita una Nota de Crédito.',
      );
    }

    const now = new Date();
    const voided = await this.prisma.purchaseBill.update({
      where: { id },
      data: {
        status: 'VOID' as any,
        voidedAt: now,
        voidReason: reason,
        // Prov. 0071 Art. 22: documento anulado reporta montos en cero
        totalAmount:    0,
        taxableAmount:  0,
        taxAmount:      0,
        retentionIVA:   0,
        retentionISLR:  0,
      } as any,
    });

    // Revertir orden de compra si aplica
    if (bill.purchaseOrderId) {
      const remainingActive = await this.prisma.purchaseBill.count({
        where: {
          purchaseOrderId: bill.purchaseOrderId,
          status: { not: 'VOID' as any },
        },
      });
      if (remainingActive === 0) {
        await this.prisma.purchaseOrder.update({
          where: { id: bill.purchaseOrderId },
          data: { status: 'RECEIVED' },
        });
      }
    }

    return voided;
  }

  // ---------------------------------------------------------
  // FASE 2: COMPRA DIRECTA — GASTO (SIN INVENTARIO)
  // Los ítems son gastos operativos (servicios, suministros, etc.)
  // NO se crea recepción ni se modifica el stock.
  // ---------------------------------------------------------

  /**
   * Calcula el monto de descuento en USD dado el tipo y valor ingresado.
   * @param type     'PERCENT' | 'FIXED_USD' | 'FIXED_VES'
   * @param value    Valor ingresado por el usuario
   * @param bruto    Monto bruto de la línea (qty × unitPrice) en USD
   * @param tcambio  Tasa de cambio Bs/USD (solo relevante para FIXED_VES)
   */
  private calcDiscountAmount(
    type: string | undefined,
    value: number | undefined,
    bruto: number,
    tcambio: number,
  ): number {
    if (!type || !value || value <= 0) return 0;
    switch (type) {
      case 'PERCENT':
        return bruto * (value / 100);
      case 'FIXED_USD':
        return value;
      case 'FIXED_VES':
        return tcambio > 0 ? value / tcambio : 0;
      default:
        return 0;
    }
  }

  async createDirect(
    companyId: string,
    userId: string,
    data: CreateDirectPurchaseDto,
  ): Promise<PurchaseBill> {
    const { supplierId, invoiceNumber, controlNumber, issueDate, items, islrConceptId } = data;
    const exchangeRate = data.exchangeRate ?? 1;

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          // Calcular totales de los ítems de gasto (después del descuento)
          let calculatedBase = 0;   // Base imponible total (sin IVA)
          let calculatedTax  = 0;   // IVA total
          let calculatedTotal = 0;  // Total factura (base + IVA)

          const itemsToCreate = items.map((i) => {
            const bruto = Number(i.quantity) * Number(i.unitPrice);
            const discountAmount = this.calcDiscountAmount(
              i.discountType,
              i.discountValue,
              bruto,
              exchangeRate,
            );
            // Base neta de la línea (lo que se guarda en totalLine)
            const base = bruto - discountAmount;
            const tax  = base * (Number(i.taxRate ?? 0) / 100);

            calculatedBase  += base;
            calculatedTax   += tax;
            calculatedTotal += base + tax;

            return {
              expenseCategoryId: i.expenseCategoryId ?? null,
              description:       i.description ?? null,
              quantity:          i.quantity,
              unitPrice:         i.unitPrice,
              taxRate:           i.taxRate  ?? 0,
              islrRate:          i.islrRate ?? 0,
              discountType:      i.discountType  ?? null,
              discountValue:     i.discountValue ?? null,
              discountAmount,
              // totalLine es la base neta (sin IVA) — coincide con el resto del sistema
              totalLine:         i.totalLine ?? base,
            };
          });

          // 0.5 CALCULAR ISLR SI APLICA
          let islrCalc: { taxableBase: number; percentage: number; sustraendo: number; retainedAmount: number; } | null = null;
          if (islrConceptId) {
            islrCalc = await this.islrService.calculateRetention({
              taxableBase: data.taxableAmount ?? calculatedBase, 
              conceptId: islrConceptId,
              supplierId: supplierId,
              companyId: companyId
            });
          }

          // 1. Crear la Factura de Gasto (PurchaseBill con isExpense = true)
          const bill = await tx.purchaseBill.create({
            data: {
              companyId,
              supplierId,
              invoiceNumber,
              controlNumber,
              issueDate: new Date(issueDate),
              status: 'UNPAID',
              isExpense: true, // ← Marca la factura como GASTO, no inventario
              retentionISLR: islrCalc?.retainedAmount || 0,
              rateRetISLR: islrCalc?.percentage || 0,
              totalAmount:   data.totalAmount   ?? calculatedTotal,
              taxableAmount: data.taxableAmount ?? calculatedBase,
              taxAmount:     data.taxAmount     ?? calculatedTax,
              exchangeRate,
              currencyCode:  data.currencyCode || 'USD',
              userId,
              createdById: userId,
              items: { create: itemsToCreate },
            },
          });

          // ✅ NO se crea GoodsReceipt — no hay entrada física al almacén
          // ✅ NO se modifica currentStock — es un gasto, no mercancía
          // ✅ NO se recalcula costAverage — el inventario no se ve afectado

          // 2. REGISTRAR ISLR HISTORY SI APLICA
          if (islrCalc && islrCalc.retainedAmount > 0) {
            const controlNumberGen = `ISLR-${companyId.substring(0,4).toUpperCase()}-${Date.now()}`;
            
            await tx.islrRetention.create({
              data: {
                companyId,
                supplierId,
                conceptId: islrConceptId!,
                controlNumber: controlNumberGen,
                totalInvoice: data.totalAmount ?? calculatedTotal,
                taxableBase: islrCalc.taxableBase,
                percentage: islrCalc.percentage,
                sustraendo: islrCalc.sustraendo,
                retainedAmount: islrCalc.retainedAmount,
                retentionDate: new Date()
              }
            });
          }

          return bill;
        },
        {
          maxWait: 5000,
          timeout: 20000,
        },
      );

      return result as unknown as PurchaseBill;
    } catch (error: any) {
      console.error('Error creating direct purchase (expense):', error);
      throw new BadRequestException(
        error.message || 'Error al crear la compra directa',
      );
    }
  }
}
