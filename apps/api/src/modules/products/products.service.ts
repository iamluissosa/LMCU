import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // 1. CREAR PRODUCTO (INTELIGENTE)
  async create(data: any) {
    // PASO A: Buscar la primera empresa disponible en la BD
    const company = await this.prisma.company.findFirst();

    if (!company) {
      // Si no hay empresa, lanzamos una alerta clara
      throw new NotFoundException(
        '❌ NO SE PUEDE GUARDAR: No existe ninguna empresa registrada en la Base de Datos. Ejecuta el seed o crea una empresa en Supabase.',
      );
    }

    // PASO B: Crear el producto vinculándolo a esa empresa real
    return this.prisma.product.create({
      data: {
        code: data.code,
        name: data.name,
        priceBase: data.priceBase,     // Ya viene como número desde el frontend
        currentStock: data.currentStock, // Ya viene como número
        companyId: company.id,         // ✅ USAMOS EL ID REAL
      },
    });
  }

  // 2. LISTAR TODOS
  async findAll() {
    return this.prisma.product.findMany({
      orderBy: { name: 'asc' }, // Orden alfabético (A-Z)
    });
  }

  // 3. BUSCAR UNO
  async findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
    });
  }

  // 4. ACTUALIZAR
  async update(id: string, data: any) {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  // 5. BORRAR
  async remove(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}