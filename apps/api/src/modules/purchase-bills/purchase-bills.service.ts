import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PurchaseBillsService {
  constructor(private prisma: PrismaService) {}

  // REGISTRAR FACTURA (I/R)
  async create(companyId: string, data: any) {
    const { 
      supplierId, purchaseOrderId, invoiceNumber, controlNumber, 
      issueDate, items 
    } = data;

    return this.prisma.$transaction(async (tx) => {
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
           throw new BadRequestException(`El producto ${billItem.productName} no pertenece a esta Orden.`);
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
      const bill = await tx.purchaseBill.create({
        data: {
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
            create: items.map((i: any) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              taxRate: i.taxRate || 0,
              islrRate: i.islrRate || 0,
              totalLine: i.totalLine || (i.quantity * i.unitPrice)
            }))
          }
        }
      });

      return bill;
    });
  }

  // Listar Facturas
  async findAll(companyId: string) {
    return this.prisma.purchaseBill.findMany({
      where: { companyId },
      include: { 
        supplier: { select: { name: true } },
        items: { include: { product: true } }
      },
      orderBy: { issueDate: 'desc' }
    });
  }

  // Eliminar Factura (Solo si es UNPAID)
  async remove(id: string) {
    const bill = await this.prisma.purchaseBill.findUnique({ where: { id } });
    if (!bill) throw new BadRequestException('Factura no encontrada');

    if (bill.status !== 'UNPAID') {
      throw new BadRequestException('Solo se pueden eliminar facturas en estado UNPAID');
    }

    // Al eliminar la factura, deberíamos (idealmente) revertir la recepción si fue un error, 
    // pero como no tracking quantityReceived decrement, asumimos que solo borra el registro financiero.
    // Si queremos ser estrictos con el 3-way match, esto es complejo. 
    // Por ahora, borramos la factura y sus items (cascade si esta configurado, sino manual).
    
    return this.prisma.purchaseBill.delete({ where: { id } });
  }
}