import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from '@erp/types';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  // 1. Crear Proveedor
  async create(companyId: string, data: CreateSupplierDto): Promise<Supplier> {
    const created = await this.prisma.supplier.create({
      data: {
        companyId,
        name: data.name,
        rif: data.rif,
        email: data.email,
        phone: data.phone,
        address: data.address,
        retentionISLR: data.retentionISLR ? Number(data.retentionISLR) : 0,
        paymentTerms: Number(data.paymentTerms) || 0,
        contactName: data.contactName,
        personType: data.personType as any,
      },
    });
    return created as unknown as Supplier; // Casting temporal si Prisma types difieren ligeramente
  }

  // 2. Listar (SOLO de mi empresa) con paginación
  async findAll(
    companyId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    items: Supplier[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;

    if (!this.prisma.supplier) {
      // Return empty list safely or throw specific error?
      // Better to throw so admin knows to fix it, but specific error is better than 500
      throw new BadRequestException(
        'Prisma Client out of sync (Supplier model missing). Restart/Regenerate.',
      );
    }

    try {
      const [suppliers, total] = await Promise.all([
        this.prisma.supplier.findMany({
          where: { companyId },
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        this.prisma.supplier.count({ where: { companyId } }),
      ]);

      return {
        items: suppliers as unknown as Supplier[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      throw new BadRequestException(
        `Error fetching suppliers: ${error.message}`,
      );
    }
  }

  // 3. Buscar uno (validando propiedad)
  async findOne(id: string, companyId: string): Promise<Supplier> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId },
    });
    if (!supplier) {
      throw new NotFoundException(
        'Proveedor no encontrado o no pertenece a tu empresa',
      );
    }
    return supplier as unknown as Supplier;
  }

  // 4. Actualizar (validando propiedad)
  async update(
    id: string,
    data: UpdateSupplierDto,
    companyId: string,
  ): Promise<Supplier> {
    await this.findOne(id, companyId);
    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...data,
        retentionISLR:
          data.retentionISLR !== undefined
            ? Number(data.retentionISLR)
            : undefined,
        paymentTerms:
          data.paymentTerms !== undefined
            ? Number(data.paymentTerms)
            : undefined,
        personType: data.personType as any,
      },
    });
    return updated as unknown as Supplier;
  }

  // 5. Eliminar (validando propiedad)
  async remove(id: string, companyId: string): Promise<Supplier> {
    await this.findOne(id, companyId);
    const deleted = await this.prisma.supplier.delete({
      where: { id },
    });
    return deleted as unknown as Supplier;
  }

  // DEBUG: Listar permisos
  async debugGetPermissions() {
    const roles = await this.prisma.role.findMany();
    return { roles };
  }

  // DEBUG: Arreglar permisos
  async debugFixPermissions() {
    const roleBuilder = await this.prisma.role.findFirst({
      where: { name: 'Compras' },
    });

    if (!roleBuilder) return { message: 'Rol Compras no encontrado' };

    const currentPerms = (roleBuilder.permissions as any) || [];
    const newPerms = new Set([...currentPerms]);

    // Agregar permisos faltantes (Suppliers + Inventory + Purchase Orders)
    [
      'suppliers.create',
      'suppliers.view',
      'suppliers.edit',
      'suppliers.delete',
      'inventory.create',
      'inventory.view',
      'inventory.edit',
      'inventory.delete',
      'purchase_orders.create',
      'purchase_orders.view',
    ].forEach((p) => newPerms.add(p));

    const updatedRole = await this.prisma.role.update({
      where: { id: roleBuilder.id },
      data: {
        permissions: Array.from(newPerms),
      },
    });

    return { message: 'Permisos actualizados', role: updatedRole };
  }
}
