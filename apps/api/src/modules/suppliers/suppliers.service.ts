import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  // 1. Crear Proveedor
  async create(companyId: string, data: any) {
    return this.prisma.supplier.create({
      data: {
        companyId, // Vinculamos a la empresa del usuario
        name: data.name,
        rif: data.rif,
        email: data.email,
        phone: data.phone,
        address: data.address,
        retentionISLR: data.retentionISLR ? Number(data.retentionISLR) : 0,
        paymentTerms: Number(data.paymentTerms) || 0,
      },
    });
  }

  // 2. Listar (SOLO de mi empresa)
  async findAll(companyId: string) {
    return this.prisma.supplier.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  // 3. Buscar uno (Validando que sea de mi empresa por seguridad)
  async findOne(id: string) {
    return this.prisma.supplier.findUnique({
      where: { id },
    });
  }

  // 4. Actualizar
  async update(id: string, data: any) {
    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        rif: data.rif,
        email: data.email,
        phone: data.phone,
        address: data.address,
        retentionISLR: data.retentionISLR ? Number(data.retentionISLR) : 0,
        paymentTerms: Number(data.paymentTerms) || 0,
      },
    });
  }

  // 5. Eliminar
  async remove(id: string) {
    return this.prisma.supplier.delete({
      where: { id },
    });
  }
}