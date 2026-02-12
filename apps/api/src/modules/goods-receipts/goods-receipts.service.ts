import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoodsReceiptsService {
  constructor(private prisma: PrismaService) {}

  // Crear Recepción (El núcleo del inventario)
  async create(companyId: string, data: any) {
    const { purchaseOrderId, items, notes } = data;

    // 1. Iniciamos una Transacción (Todo o Nada)
    return this.prisma.$transaction(async (tx) => {
      
      // A. Validar que la Orden existe y pertenece a la empresa
      const po = await tx.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: { items: true },
      });

      if (!po || po.companyId !== companyId) {
        throw new BadRequestException('Orden de compra no válida.');
      }

      // B. Crear la Cabecera de Recepción
      // Generamos un correlativo temporal (idealmente usarías CompanySettings)
      const receiptNumber = `RX-${Date.now().toString().slice(-6)}`; 

      const reception = await tx.goodsReceipt.create({
        data: {
          companyId,
          purchaseOrderId,
          receiptNumber,
          comments: notes,
          receivedById: data.receivedById, // ID del usuario que recibe
        },
      });

      // C. Procesar cada Item (Loop Crítico)
      let allItemsClosed = true;

      for (const item of items) {
        const receivedQty = Number(item.quantity);
        if (receivedQty <= 0) continue;

        // 1. Buscar el item original en la PO para saber el PRECIO PACTADO
        const poItem = po.items.find((i) => i.productId === item.productId);
        if (!poItem) throw new BadRequestException(`Producto ${item.productId} no está en la orden.`);

        // 2. Buscar el Producto actual (Stock y Costo)
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new BadRequestException(`Producto ${item.productId} no encontrado en base de datos.`);

        // 3. CÁLCULO DE COSTO PROMEDIO PONDERADO
        const currentStock = Number(product.currentStock || 0);
        const currentCost = Number(product.costAverage || 0);
        const incomingCost = Number(poItem.unitPrice || 0); // Costo en la Orden (USD)

        const totalValueOld = currentStock * currentCost;
        const totalValueNew = receivedQty * incomingCost;
        const newTotalQty = currentStock + receivedQty;

        // Evitar división por cero
        const newAverageCost = newTotalQty > 0 
          ? (totalValueOld + totalValueNew) / newTotalQty 
          : incomingCost;

        // 4. ACTUALIZAR PRODUCTO (Stock + Costo)
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: receivedQty },
            costAverage: newAverageCost,
          },
        });

        // 5. ACTUALIZAR ITEM DE LA PO (Lo recibido)
        const newReceivedTotal = Number(poItem.quantityReceived) + receivedQty;
        const isClosed = newReceivedTotal >= Number(poItem.quantityOrdered);
        if (!isClosed) allItemsClosed = false;

        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: {
            quantityReceived: newReceivedTotal,
            isClosed: isClosed,
          },
        });

        // 6. CREAR ITEM DE RECEPCIÓN (Historial)
        await tx.goodsReceiptItem.create({
          data: {
            goodsReceiptId: reception.id,
            productId: item.productId,
            quantity: receivedQty,
          },
        });
      }

      // D. Actualizar Estado General de la PO
      const newStatus = allItemsClosed ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: newStatus },
      });

      return reception;
    });
  }

  // Listar Recepciones
  async findAll(companyId: string) {
    return this.prisma.goodsReceipt.findMany({
      where: { companyId },
      include: { 
        purchaseOrder: { select: { orderNumber: true, supplier: { select: { name: true } } } },
        items: { include: { product: true } }
      },
      orderBy: { receivedAt: 'desc' }
    });
  }
}