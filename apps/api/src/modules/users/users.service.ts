import { Injectable, NotFoundException } from '@nestjs/common';
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

  // 2. Listar Usuarios (Siempre filtrado por companyId)
  async findAll(companyId: string, role?: string) {
    // S-07: Eliminado bypass de ADMIN para garantizar aislamiento
    return this.prisma.user.findMany({
      where: { companyId },
      include: {
        company: true,
        role: true, 
      },
      orderBy: { name: 'asc' },
    });
  }

  // 3. Buscar uno (Validando companyId)
  async findOne(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId },
      include: {
        company: true,
        role: true,
      },
    });

    if (!user) {
        // Si no lo encuentra con ese companyId, lanzamos error o retornamos null
        // Para consistencia con findOne original que retornaba null si no existía el ID:
        return null; 
    }
    return user;
  }



  // 4. Actualizar
  async update(id: string, data: any, companyId: string) {
    // Validar pertenencia
    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) throw new NotFoundException('Usuario no encontrado o no pertenece a tu empresa');

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // 5. Eliminar
  async remove(id: string, companyId: string) {
    // Validar pertenencia
    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) throw new NotFoundException('Usuario no encontrado o no pertenece a tu empresa');

    return this.prisma.user.delete({ where: { id } });
  }

  // 6. Buscar usuario por ID (para autenticación)
  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        company: true, // Incluir datos de la empresa
        role: true,    // Incluir rol (campos escalares inc. permissions json)
      },
    });
  }
}
