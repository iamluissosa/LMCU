import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // 1. CREAR PRODUCTO (Vinculado a la compañía del usuario)
  async create(data: any, companyId: string) {
    if (!companyId)
      throw new ForbiddenException('Usuario no tiene empresa asignada');

    return this.prisma.product.create({
      data: {
        code: data.code,
        name: data.name,
        priceBase: data.priceBase,
        currentStock: data.currentStock,
        companyId: companyId, // ✅ Usamos el ID del usuario
      },
    });
  }

  // 2. LISTAR con paginación (Solo de mi empresa o TODO si es ADMIN)
  async findAll(companyId: string, pagination: PaginationDto, role?: string): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    if (!this.prisma.product) {
       throw new BadRequestException('Prisma Client out of sync (Product model missing). Restart/Regenerate.');
    }


    // Si es ADMIN real (no importa si tiene companyId o no, un Super Admin ve todo)
    if (role === 'ADMIN') {
      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          skip,
          take: limit,
          include: { company: true }, // Incluimos info de la empresa para saber de quién es
          orderBy: {
            company: { name: 'asc' }, // Ordenar por empresa y luego nombre
          },
        }),
        this.prisma.product.count()
      ]);

      return {
        items: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    if (!companyId) return { items: [], pagination: { page, limit, total: 0, totalPages: 0 } };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { companyId },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where: { companyId } })
    ]);

    return {
      items: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // 3. BUSCAR UNO (Validando que sea de mi empresa)
  async findOne(id: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
    });

    if (!product)
      throw new NotFoundException(
        'Producto no encontrado o no pertenece a tu empresa',
      );
    return product;
  }

  // 4. ACTUALIZAR (Validando propiedad)
  async update(id: string, data: any, companyId: string) {
    // Primero verificamos que el producto exista y sea de la empresa
    await this.findOne(id, companyId);

    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  // 5. BORRAR (Validando propiedad)
  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    try {
      return await this.prisma.product.delete({
        where: { id },
      });
    } catch (error: any) {
      // P2003: Foreign key constraint failed
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'No se puede eliminar este producto porque tiene movimientos asociados (Compras, Inventario o Ventas).',
        );
      }
      throw error;
    }
  }
}
