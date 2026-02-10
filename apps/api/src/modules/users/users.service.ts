import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt'; // Asegúrate de tener: pnpm add bcrypt @types/bcrypt

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 1. Crear Usuario (Opcional, si quieres crearlos manual)
  async create(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || 'USER',
        companyId: data.companyId, // Vinculamos a la empresa aquí
      },
    });
  }

  // 2. Listar Usuarios (Incluyendo datos de la empresa)
  async findAll() {
    return this.prisma.user.findMany({
      include: {
        company: true, // ¡Truco! Trae el nombre de la empresa, no solo el ID
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

  // 4. Actualizar (Para asignar empresa o cambiar rol)
  async update(id: string, data: any) {
    // Si envían password, hay que encriptarlo de nuevo
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