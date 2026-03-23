import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        islrConcept: {
          select: { id: true, code: true, description: true },
        },
      },
    });
  }

  async create(
    companyId: string,
    data: { name: string; description?: string; islrConceptId?: string | null },
  ) {
    return this.prisma.expenseCategory.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        islrConceptId: data.islrConceptId || null,
      },
      include: {
        islrConcept: {
          select: { id: true, code: true, description: true },
        },
      },
    });
  }

  async update(
    id: string,
    companyId: string,
    data: { name?: string; description?: string; islrConceptId?: string | null; isActive?: boolean },
  ) {
    return this.prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.islrConceptId !== undefined && { islrConceptId: data.islrConceptId || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        islrConcept: {
          select: { id: true, code: true, description: true },
        },
      },
    });
  }
}
