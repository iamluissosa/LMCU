import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 1. Crear Usuario
  async create(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        id: data.id, // ✅ Permitimos setear ID (para sync con Supabase)
        email: data.email,
        password: hashedPassword,
        name: data.name,
        roleLegacy: data.roleLegacy || data.role || 'USER',
        companyId: data.companyId,
      },
    });
  }

  // 2. Listar Usuarios (FILTRADO POR EMPRESA)
  // 2. Listar Usuarios (FILTRADO POR EMPRESA o TODO si es ADMIN)
  async findAll(companyId: string, role?: string) {
    if (role === 'ADMIN') {
      return this.prisma.user.findMany({
        include: { company: true, role: true },
        orderBy: { name: 'asc' },
      });
    }

    const whereCondition = companyId ? { companyId } : {};

    return this.prisma.user.findMany({
      where: whereCondition,
      include: {
        company: true,
        role: true, // Include role details
      },
      orderBy: { name: 'asc' },
    });
  }

  // 3. Buscar uno
  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        company: true,
        role: true, // ✅ Traemos el rol con sus permisos
      },
    });
  }

  // 4. Actualizar
  async update(id: string, data: any) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // 5. Eliminar
  async remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
