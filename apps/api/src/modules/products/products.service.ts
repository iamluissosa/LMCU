import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // 1. CREAR PRODUCTO (Vinculado a la compañía del usuario)
  async create(data: any, companyId: string) {
    if (!companyId) throw new ForbiddenException('Usuario no tiene empresa asignada');

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

  // 2. LISTAR (Solo de mi empresa o TODO si es ADMIN)
  async findAll(companyId: string, role?: string) {
    // Si es ADMIN real (no importa si tiene companyId o no, un Super Admin ve todo)
    if (role === 'ADMIN') {
        return this.prisma.product.findMany({
            include: { company: true }, // Incluimos info de la empresa para saber de quién es
            orderBy: { 
                company: { name: 'asc' } // Ordenar por empresa y luego nombre
            }
        });
    }

    if (!companyId) return []; 

    return this.prisma.product.findMany({
      where: { companyId }, 
      orderBy: { name: 'asc' },
    });
  }

  // 3. BUSCAR UNO (Validando que sea de mi empresa)
  async findOne(id: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId }
    });

    if (!product) throw new NotFoundException('Producto no encontrado o no pertenece a tu empresa');
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

    return this.prisma.product.delete({
      where: { id },
    });
  }
}