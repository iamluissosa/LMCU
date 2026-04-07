import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
} from './dto/service-category.dto';

@Injectable()
export class ServiceCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateServiceCategoryDto) {
    return this.prisma.serviceCategory.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.serviceCategory.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id, companyId },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  async update(companyId: string, id: string, dto: UpdateServiceCategoryDto) {
    const category = await this.findOne(companyId, id);
    return this.prisma.serviceCategory.update({
      where: { id: category.id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    const category = await this.findOne(companyId, id);
    return this.prisma.serviceCategory.delete({
      where: { id: category.id },
    });
  }
}
