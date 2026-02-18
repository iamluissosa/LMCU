import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { POStatus } from '@repo/database';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  // 1. Crear Orden de Compra (Draft)
  async create(companyId: string, userId: string, data: any) {
    if (!data.supplierId)
      throw new BadRequestException('El proveedor es obligatorio');

    // Generar correlativo (simple, se puede mejorar usando CompanySettings)
    const count = await this.prisma.purchaseOrder.count({
      where: { companyId },
    });
    const orderNumber = `OC-${String(count + 1).padStart(4, '0')}`;

    try {
      return await this.prisma.purchaseOrder.create({
        data: {
          companyId,
          ...(userId ? { createdBy: { connect: { id: userId } } } : {}),
          ...(userId ? { updatedBy: { connect: { id: userId } } } : {}),
          supplierId: data.supplierId,
          orderNumber,
          status: POStatus.OPEN,
          notes: data.notes,
          currencyCode: data.currencyCode || 'USD',
          exchangeRate: data.exchangeRate || 1,
          totalAmount:
            data.items?.reduce(
              (acc, item) =>
                acc + Number(item.quantityOrdered) * Number(item.unitPrice),
              0,
            ) || 0,
          // Si vienen items al crear
          items: {
            create:
              data.items?.map((item: any) => ({
                productId: item.productId,
                quantityOrdered: Number(item.quantityOrdered),
                unitPrice: Number(item.unitPrice),
              })) || [],
          },
        } as any, // Cast por EPERM
        include: { items: true, supplier: true },
      });
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      throw new BadRequestException(error.stack || error.message || 'Error al crear la orden de compra');
    }
  }

  // 2. Listar con paginación
  async findAll(companyId: string, pagination: PaginationDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20 } = pagination || {};
    const skip = (page - 1) * limit;

    if (!this.prisma.purchaseOrder) {
      throw new BadRequestException('Prisma Client out of sync (PurchaseOrder model missing). Restart/Regenerate.');
    }

    try {
      const [orders, total] = await Promise.all([
        this.prisma.purchaseOrder.findMany({
          where: { 
            companyId,
            deletedAt: null 
          } as any,
          skip,
          take: limit,
          include: {
            supplier: { select: { name: true } },
            _count: { select: { items: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.purchaseOrder.count({ 
          where: { 
            companyId,
            deletedAt: null 
          } as any 
        })
      ]);

      return {
        items: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      console.error('Error fetching purchase orders:', error);
      throw new BadRequestException(`Error fetching orders: ${error.message}`);
    }


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
  async update(id: string, userId: string, data: any) {
    // Si queremos actualizar items, lo mejor es hacerlo transaccional o via endpoints dedicados
    // Aquí soportamos actualizar estado, notas, etc.
    // Si se envían items, se REEMPLAZAN (modo simple) o se actualizan (complejo).
    // Para simplificar, si data.items existe, borramos los viejos y creamos nuevos (solo en DRAFT)

    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!po) throw new BadRequestException('Orden de compra no encontrada');

    if (po.status !== POStatus.OPEN && data.items) {
      throw new BadRequestException(
        'Solo se pueden modificar items en estado Abierto (OPEN)',
      );
    }

    // Transaccion
    return this.prisma.$transaction(async (tx) => {
      let newTotal: number | undefined = undefined;

      // 1. Si hay items, reemplazar y calcular nuevo total
      if (data.items && po.status === POStatus.OPEN) {
        console.log('Update PO: Recalculando total con items:', data.items.length);
        
        // Borrar anteriores
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        });

        // Crear nuevos
        let calculatedTotal = 0;
        for (const item of data.items) {
          const qty = Number(item.quantityOrdered);
          const price = Number(item.unitPrice);
          const lineTotal = qty * price;
          calculatedTotal += lineTotal;

          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: id,
              productId: item.productId,
              quantityOrdered: qty,
              unitPrice: price,
            },
          });
        }
        newTotal = calculatedTotal;
        console.log('Update PO: Nuevo Total Calculado:', newTotal);
      } else {
        console.log('Update PO: No se actualizaron items. Status:', po.status, 'Items received:', !!data.items);
      }

      // 2. Actualizar cabecera con el nuevo total si hubo cambio de items
      const updateData: any = {
        supplierId: data.supplierId,
        notes: data.notes,
        currencyCode: data.currencyCode,
        exchangeRate: data.exchangeRate,
        status: data.status,
      };

      if (newTotal !== undefined) {
        updateData.totalAmount = newTotal;
        console.log('Update PO: Actualizando cabecera totalAmount a:', newTotal);
      }

      const updatedPO = await tx.purchaseOrder.update({
        where: { id },
        data: {
          ...updateData,
          updatedBy: { connect: { id: userId } },
        } as any,
        include: { items: true }, // Retornar items actualizados
      });

      return updatedPO;
    });
  }

  // 5. Eliminar (Solo si está en DRAFT)
  async remove(userId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (po?.status !== POStatus.OPEN)
      throw new BadRequestException(
        'Solo se pueden eliminar órdenes en estado Abierto (OPEN)',
      );

    // Soft Delete
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: { connect: { id: userId } },
        status: 'CANCELLED', // Opcional: Marcar como CANCELLED o mantener OPEN pero borrado? Mejor CANCELLED
      } as any,
    });
  }
}
