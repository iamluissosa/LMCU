import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  // 1. Crear Empresa
  async create(data: any) {
    return this.prisma.company.create({
      data: {
        name: data.name,
        rif: data.rif,
        address: data.address,
        state: data.state,
        city: data.city,
        taxpayerType: data.taxpayerType,
        phone: data.phone,     // ✅
        email: data.email,     // ✅
        website: data.website, // ✅ Nuevo campo
      },
    });
  }

  // 2. Listar todas (Filtradas por Empresa)
  async findAll(companyId?: string) {
    if (companyId) {
      return this.prisma.company.findMany({
        where: { id: companyId },
      });
    }
    // Si no hay companyId (ej. Admin global o debug), retornamos todas o vacío.
    // Por seguridad, si es un usuario normal sin companyId, no debería ver nada.
    return this.prisma.company.findMany();
  }

  // 3. Buscar una
  async findOne(id: string) {
    return this.prisma.company.findUnique({ where: { id } });
  }

  // 4. Actualizar
  async update(id: string, data: any) {
    return this.prisma.company.update({
      where: { id },
      data,
    });
  }

  // 5. Eliminar
  async remove(id: string) {
    return this.prisma.company.delete({ where: { id } });
  }
}