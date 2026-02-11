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
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || 'USER',
        companyId: data.companyId,
      },
    });
  }

  // 2. Listar Usuarios (FILTRADO POR EMPRESA)
  async findAll(companyId: string) {
    // Si el usuario no tiene empresa (ej. Super Admin global), quizás quiera ver todos.
    // Pero por seguridad estricta, si companyId viene, filtramos.
    
    const whereCondition = companyId ? { companyId } : {};

    return this.prisma.user.findMany({
      where: whereCondition, // 👈 Aquí aplicamos el filtro
      include: {
        company: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // 3. Buscar uno
  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { company: true },
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