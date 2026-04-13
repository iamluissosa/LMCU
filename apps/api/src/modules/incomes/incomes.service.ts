import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IncomesService {
  constructor(private prisma: PrismaService) {}

  async create(user: any, data: any) {
    let companyId = user.companyId;

    // Si el usuario es ADMIN global (sin companyId), resolver desde el evento target
    if (!companyId && data.eventDetails?.length > 0) {
      const event = await this.prisma.event.findUnique({
        where: { id: data.eventDetails[0].eventId },
        select: { companyId: true },
      });
      if (event) companyId = event.companyId;
    }

    if (!companyId) {
      throw new BadRequestException(
        'No se pudo determinar la empresa. Asegúrese de vincular al menos un evento.',
      );
    }

    // data.eventDetails es un array de { eventId: string, amountApplied: number }
    return this.prisma.$transaction(async (tx) => {
      const income = await tx.income.create({
        data: {
          companyId,
          amount: data.amount,
          currencyCode: data.currencyCode || 'USD',
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          clientName: data.clientName,
          description: data.description,
          eventDetails: {
            create: data.eventDetails.map((detail: any) => ({
              eventId: detail.eventId,
              amountApplied: detail.amountApplied,
            })),
          },
        },
        include: { eventDetails: true },
      });
      return income;
    });
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.income.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ingreso no encontrado');

    return this.prisma.$transaction(async (tx) => {
      // Actualizar campos del ingreso
      const updated = await tx.income.update({
        where: { id },
        data: {
          ...(data.amount !== undefined && { amount: data.amount }),
          ...(data.currencyCode !== undefined && { currencyCode: data.currencyCode }),
          ...(data.paymentDate !== undefined && { paymentDate: new Date(data.paymentDate) }),
          ...(data.clientName !== undefined && { clientName: data.clientName }),
          ...(data.description !== undefined && { description: data.description }),
        },
      });

      // Si se envían eventDetails, reemplazar las distribuciones existentes
      if (data.eventDetails) {
        await tx.incomeEventDetail.deleteMany({ where: { incomeId: id } });
        await tx.incomeEventDetail.createMany({
          data: data.eventDetails.map((d: any) => ({
            incomeId: id,
            eventId: d.eventId,
            amountApplied: d.amountApplied,
          })),
        });
      }

      return tx.income.findUnique({
        where: { id },
        include: { eventDetails: true },
      });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.income.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ingreso no encontrado');

    // IncomeEventDetail tiene onDelete: Cascade, así que se borra automáticamente
    await this.prisma.income.delete({ where: { id } });
    return { deleted: true };
  }
}
