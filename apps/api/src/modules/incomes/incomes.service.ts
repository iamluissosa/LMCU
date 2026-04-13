import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IncomesService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, data: any) {
    // data.eventDetails es un array the { eventId: string, amountApplied: number }
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
              amountApplied: detail.amountApplied
            }))
          }
        },
        include: { eventDetails: true }
      });
      return income;
    });
  }
}
