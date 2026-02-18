import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseBillsRepository } from './purchase-bills.repository';
import { CreatePurchaseBillDto } from './dto/create-purchase-bill.dto';
import { PurchaseBill } from '@erp/types';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class PurchaseBillsService {
  constructor(
    private prisma: PrismaService,
    private billsRepository: PurchaseBillsRepository
  ) {}

  // REGISTRAR FACTURA (I/R)
  async create(companyId: string, userId: string, data: CreatePurchaseBillDto): Promise<PurchaseBill> {
    const { 
      supplierId, purchaseOrderId, invoiceNumber, controlNumber, 
      issueDate, items 
    } = data;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Validar la Orden de Compra (PO)
        const po = await tx.purchaseOrder.findUnique({
          where: { id: purchaseOrderId },
          include: { items: true } // Traemos los items para ver cuánto se ha recibido
        });

        if (!po || po.companyId !== companyId) {
          throw new BadRequestException('Orden de compra no válida.');
        }

        // 1.1 Actualizar Estatus de la Orden a BILLED
        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: { status: 'BILLED' } // Nuevo estatus
        });

        // 2. Calcular Totales y VALIDAR MATCH (El corazón del sistema)
        let calculatedSubtotal = 0;

        for (const billItem of items) {
          const qtyBilled = Number(billItem.quantity);
          const priceBilled = Number(billItem.unitPrice);

          // A. Buscar el item en la PO original
          const poItem = po.items.find(i => i.productId === billItem.productId);
          
          if (!poItem) {
             // Opcional: Permitir items extra (gastos de envío, etc), pero por ahora bloqueamos
             throw new BadRequestException(`El producto ${billItem.productName || 'Desconocido'} no pertenece a esta Orden.`);
          }

          // B. THREE-WAY MATCH: ¿Lo facturado excede lo recibido?
          // Nota: En un sistema v2, deberíamos restar lo que YA se facturó anteriormente.
          // Por ahora validamos contra el total recibido acumulado.
          const qtyReceived = Number(poItem.quantityReceived);

          if (qtyBilled > qtyReceived) {
            throw new BadRequestException(
              `Error en ${billItem.productName}: Intentas pagar ${qtyBilled} pero solo han entrado ${qtyReceived} al almacén.`
            );
          }

          calculatedSubtotal += (qtyBilled * priceBilled);
        }

        // 3. Crear la Factura
        const bill = await this.billsRepository.create(companyId, userId, {
          companyId,
          supplierId,
          purchaseOrderId,
          invoiceNumber,
          controlNumber,
          issueDate: new Date(issueDate),
          status: 'UNPAID', // Nace como cuenta por pagar
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
              totalLine: i.totalLine || (i.quantity * i.unitPrice)
            }))
          }
        } as any, tx); // Pasamos tx para evitar deadlock

        return bill;
      }, {
        maxWait: 5000, // default: 2000
        timeout: 20000, // default: 5000
      });
      
      return result as unknown as PurchaseBill;
    } catch (error: any) {
      console.error('Error creating purchase bill:', error);
      throw new BadRequestException(error.message || 'Error desconocido al crear la factura');
    }
  }

  // Listar Facturas con paginación
  async findAll(companyId: string, pagination: PaginationDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20 } = pagination;

    if (!this.prisma.purchaseBill) {
      throw new BadRequestException('Prisma Client out of sync (PurchaseBill model missing). Restart/Regenerate.');
    }

    try {
      return await this.billsRepository.findAll(companyId, page, limit);
    } catch (error: any) {
      console.error('Error fetching purchase bills:', error);
      throw new BadRequestException(`Error fetching bills: ${error.message}`);
    }
  }

  // Eliminar Factura (Solo si es UNPAID y pertenece a la empresa)
  async remove(companyId: string, userId: string, id: string): Promise<PurchaseBill> {
    const bill = await this.prisma.purchaseBill.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException('Factura no encontrada');

    if (bill.companyId !== companyId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta factura');
    }

    if (bill.status !== 'UNPAID') {
      throw new BadRequestException('Solo se pueden eliminar facturas en estado UNPAID');
    }

    // Al eliminar la factura, deberíamos (idealmente) revertir la recepción si fue un error, 
    // pero como no tracking quantityReceived decrement, asumimos que solo borra el registro financiero.
    // Si queremos ser estrictos con el 3-way match, esto es complejo. 
    // Por ahora, borramos la factura y sus items (cascade si esta configurado, sino manual).
    
    try {
      const deleted = await this.billsRepository.remove(id, userId);

      // S-08: Revertir estado de la Orden de Compra si ya no tiene facturas
      if (deleted.purchaseOrderId) {
        const remainingBills = await this.billsRepository.countByOrderId(deleted.purchaseOrderId);
        
        if (remainingBills === 0) {
          // Si no quedan facturas, la orden vuelve a estar disponible para facturar (RECEIVED)
          await this.prisma.purchaseOrder.update({
            where: { id: deleted.purchaseOrderId },
            data: { status: 'RECEIVED' } 
          });
        }
      }

      return deleted as unknown as PurchaseBill;
    } catch (error: any) {
      console.error('Error removing purchase bill:', error);
      throw new BadRequestException(error.message || 'Error al eliminar la factura');
    }
  }
}