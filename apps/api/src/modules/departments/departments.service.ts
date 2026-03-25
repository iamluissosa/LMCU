import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return await this.prisma.department.findMany({
      where: { companyId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async create(companyId: string, data: { code: string; name: string; description?: string }) {
    const existing = await this.prisma.department.findUnique({
      where: { companyId_code: { companyId, code: data.code } },
    });
    if (existing) throw new ConflictException('El código del departamento ya existe');

    return this.prisma.department.create({
      data: {
        companyId,
        code: data.code,
        name: data.name,
        description: data.description,
      },
    });
  }

  async update(id: string, companyId: string, data: { name?: string; description?: string; isActive?: boolean }) {
    return await this.prisma.department.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }
}
