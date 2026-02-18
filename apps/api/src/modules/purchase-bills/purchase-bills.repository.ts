import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseBill, Prisma } from '@repo/database';

@Injectable()
export class PurchaseBillsRepository {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, userId: string, data: Prisma.PurchaseBillCreateInput, tx?: Prisma.TransactionClient): Promise<PurchaseBill> {
    const client = tx || this.prisma;
    return client.purchaseBill.create({
      data: {
        ...data,
        ...(userId ? { createdBy: { connect: { id: userId } } } : {}),
        ...(userId ? { updatedBy: { connect: { id: userId } } } : {}),
      } as any,
      include: {
        items: true,
        supplier: true,
      },
    });
  }

  async findAll(companyId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [bills, total] = await Promise.all([
      this.prisma.purchaseBill.findMany({
        where: { 
          companyId,
          deletedAt: null 
        } as any,
        skip,
        take: limit,
        include: { supplier: true, items: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseBill.count({ 
        where: { 
          companyId,
          deletedAt: null 
        } as any 
      }),
    ]);

    return {
      items: bills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, userId: string, data: Prisma.PurchaseBillUpdateInput): Promise<PurchaseBill> {
    return this.prisma.purchaseBill.update({
      where: { id },
      data: {
        ...data,
        updatedBy: { connect: { id: userId } },
      } as any, // Cast necesario por EPERM en generate
      include: {
        items: true,
        supplier: true,
      },
    });
  }

  async remove(id: string, userId: string): Promise<PurchaseBill> {
    // Soft Delete
    return this.prisma.purchaseBill.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        ...(userId ? { updatedBy: { connect: { id: userId } } } : {}),
        status: 'VOID', // Opcional: Cambiar estado a ANULADO/VOID para integridad visual
      } as any,
    });
  }

  async countByOrderId(orderId: string): Promise<number> {
    return this.prisma.purchaseBill.count({
      where: { 
        purchaseOrderId: orderId,
        deletedAt: null 
      } as any, // Cast por EPERM
    });
  }
}
