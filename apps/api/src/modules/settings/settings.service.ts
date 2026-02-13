import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // 1. Obtener Configuración (O crearla si no existe)
  async getSettings(companyId: string) {
    let settings = await this.prisma.companySettings.findUnique({
      where: { companyId },
    });

    if (!settings) {
      settings = await this.prisma.companySettings.create({
        data: { companyId },
      });
    }
    return settings;
  }

  // 2. Actualizar Configuración
  async updateSettings(companyId: string, data: any) {
    return this.prisma.companySettings.upsert({
      where: { companyId },
      update: {
        invoicePrefix: data.invoicePrefix,
        nextInvoiceNumber: Number(data.nextInvoiceNumber),
        productPrefix: data.productPrefix,
        nextProductCode: Number(data.nextProductCode),
        currency: data.currency,
      },
      create: {
        companyId,
        ...data,
      },
    });
  }

  // 3. Gestión de ROLES
  async getRoles(companyId: string, userRole?: string) {
    if (userRole === 'ADMIN') {
      return this.prisma.role.findMany({
        include: { company: true },
        orderBy: { company: { name: 'asc' } },
      });
    }
    return this.prisma.role.findMany({ where: { companyId } });
  }

  async createRole(companyId: string, data: any) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        permissions: data.permissions || [], // Array de strings
        companyId: companyId,
      },
    });
  }

  async updateRole(
    id: string,
    data: any,
    userCompanyId?: string,
    userRole?: string,
  ) {
    // Si NO es ADMIN, verificamos que el rol sea de su empresa
    if (userRole !== 'ADMIN') {
      const count = await this.prisma.role.count({
        where: { id, companyId: userCompanyId },
      });
      if (count === 0)
        throw new Error('Rol no encontrado o no pertenece a tu empresa');
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        permissions: data.permissions,
      },
    });
  }

  async deleteRole(id: string, userCompanyId?: string, userRole?: string) {
    // Si NO es ADMIN, verificamos que el rol sea de su empresa
    if (userRole !== 'ADMIN') {
      const role = await this.prisma.role.findFirst({
        where: { id, companyId: userCompanyId },
      });
      if (!role)
        throw new Error('Rol no encontrado o no pertenece a tu empresa');
    }

    return this.prisma.role.delete({ where: { id } });
  }
}
