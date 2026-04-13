import { Injectable, BadRequestException } from '@nestjs/common';
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
}

