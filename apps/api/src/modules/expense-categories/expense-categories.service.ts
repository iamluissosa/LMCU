import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(
    companyId: string,
    data: { name: string; description?: string },
  ) {
    return this.prisma.expenseCategory.create({
      data: { companyId, ...data },
    });
  }
}
