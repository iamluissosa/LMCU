import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, data: CreateClientDto) {
    // Validar RIF único dentro de la misma empresa si se proporciona
    if (data.rif) {
      const existing = await this.prisma.client.findFirst({
        where: { companyId, rif: data.rif },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe un cliente con el RIF ${data.rif} en esta empresa.`,
        );
      }
    }

    try {
      return await this.prisma.client.create({
        data: {
          ...data,
          companyId,
          islrRate:
            data.islrRate !== undefined
              ? new Decimal(data.islrRate)
              : undefined,
          paymentTerms: data.paymentTerms || 0,
          creditLimit:
            data.creditLimit !== undefined
              ? new Decimal(data.creditLimit)
              : undefined,
        },
      });
    } catch (error) {
      throw new ConflictException(
        'Error al crear el cliente. Verifique los datos.',
      );
    }
  }

  async findAll(
    companyId: string,
    params: {
      skip?: number;
      take?: number;
      search?: string;
    },
  ) {
    const { skip, take, search } = params;

    const where: any = {
      companyId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { rif: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      items,
      total,
      pages: take ? Math.ceil(total / take) : 1,
    };
  }

  async findOne(id: string, companyId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: { quotes: true, salesOrders: true, salesInvoices: true },
        },
      },
    });

    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  async update(id: string, companyId: string, data: UpdateClientDto) {
    // Verificar existencia
    await this.findOne(id, companyId);

    // Validar RIF único si se está actualizando
    if (data.rif) {
      const existing = await this.prisma.client.findFirst({
        where: { companyId, rif: data.rif, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe otro cliente con el RIF ${data.rif}.`,
        );
      }
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        ...data,
        islrRate:
          data.islrRate !== undefined ? new Decimal(data.islrRate) : undefined,
        creditLimit:
          data.creditLimit !== undefined
            ? new Decimal(data.creditLimit)
            : undefined,
      },
    });
  }

  async remove(id: string, companyId: string) {
    const client = await this.findOne(id, companyId);

    // Validar si tiene operaciones relacionadas (facturas, pedidos, cotizaciones)
    if (
      client._count.quotes > 0 ||
      client._count.salesOrders > 0 ||
      client._count.salesInvoices > 0
    ) {
      throw new ConflictException(
        'No se puede eliminar el cliente porque tiene documentos de venta asociados.',
      );
    }

    await this.prisma.client.delete({ where: { id } });
    return { success: true };
  }

  async lookupCedula(document: string) {
    // Extraer nacionalidad y número (ej. V-15007229 o V15007229)
    const match = document.match(/^([VEJCGP])?-?(\d+)$/i);
    if (!match) {
      throw new BadRequestException(
        'Formato de documento inválido para búsqueda',
      );
    }

    // Si no trae letra, asumimos V por defecto.
    const nacionalidad = (match[1] || 'V').toUpperCase();
    const cedula = match[2];

    const appId = '1999';
    const token = 'a17ab998d92e561f257fbad20c69f94f';
    const url = `https://api.cedula.com.ve/api/v1?app_id=${appId}&token=${token}&nacionalidad=${nacionalidad}&cedula=${cedula}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        throw new BadRequestException(
          data.error_str || 'Error en la API externa de Cédula',
        );
      }

      return data.data; // Retorna el objeto anidado 'data' según el JSON esperado
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al consultar el servicio CedulaVE: ' + error.message,
      );
    }
  }
}
