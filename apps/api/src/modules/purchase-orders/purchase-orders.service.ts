import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { POStatus } from '@repo/database';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  // 1. Crear Orden de Compra (Draft)
  async create(companyId: string, data: any) {
    if (!data.supplierId) throw new BadRequestException('El proveedor es obligatorio');

    // Generar correlativo (simple, se puede mejorar usando CompanySettings)
    const count = await this.prisma.purchaseOrder.count({ where: { companyId } });
    const orderNumber = `OC-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.purchaseOrder.create({
      data: {
        companyId,
        supplierId: data.supplierId,
        orderNumber,
        status: POStatus.OPEN,
        notes: data.notes,
        currencyCode: data.currencyCode || 'USD',
        exchangeRate: data.exchangeRate || 1,
        totalAmount: data.items?.reduce((acc, item) => acc + (Number(item.quantityOrdered) * Number(item.unitPrice)), 0) || 0,
        // Si vienen items al crear
        items: {
          create: data.items?.map((item: any) => ({
            productId: item.productId,
            quantityOrdered: Number(item.quantityOrdered),
            unitPrice: Number(item.unitPrice),
          })) || [],
        },
      },
      include: { items: true, supplier: true },
    });
  }

  // 2. Listar
  async findAll(companyId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { companyId },
      include: {
        supplier: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Detalle (para editar o ver)
  async findOne(id: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
    });
  }

  // 4. Actualizar (Cabecera y/o Items)
  async update(id: string, data: any) {
    // Si queremos actualizar items, lo mejor es hacerlo transaccional o via endpoints dedicados
    // Aquí soportamos actualizar estado, notas, etc.
    // Si se envían items, se REEMPLAZAN (modo simple) o se actualizan (complejo).
    // Para simplificar, si data.items existe, borramos los viejos y creamos nuevos (solo en DRAFT)

    const po = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!po) throw new BadRequestException('Orden de compra no encontrada');

    if (po.status !== POStatus.OPEN && data.items) {
      throw new BadRequestException('Solo se pueden modificar items en estado Abierto (OPEN)');
    }
    
    // Transaccion
    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar cabecera
      const updatedPO = await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: data.supplierId,
          notes: data.notes,
          currencyCode: data.currencyCode,
          exchangeRate: data.exchangeRate,
          status: data.status, // Cuidado con transiciones de estado
        },
      });

      // 2. Si hay items, reemplazar
      if (data.items && po.status === POStatus.OPEN) {
        // Borrar anteriores
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        
        // Crear nuevos
        for (const item of data.items) {
           await tx.purchaseOrderItem.create({
             data: {
               purchaseOrderId: id,
               productId: item.productId,
               quantityOrdered: Number(item.quantityOrdered),
               unitPrice: Number(item.unitPrice),
             }
           });
        }
      }
      return updatedPO;
    });
  }

  // 5. Eliminar (Solo si está en DRAFT)
  async remove(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (po?.status !== POStatus.OPEN) throw new BadRequestException('Solo se pueden eliminar órdenes en estado Abierto (OPEN)');
    
    return this.prisma.purchaseOrder.delete({ where: { id } });
  }
}
