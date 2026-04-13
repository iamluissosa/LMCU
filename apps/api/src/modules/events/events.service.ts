import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.event.findMany({
      where: { companyId },
      orderBy: { date: 'desc' },
      include: {
        incomes: true,
        expenses: {
          include: { expenseItems: true }
        }
      }
    });
  }

  async create(companyId: string, data: { name: string; date: string; status?: string }) {
    return this.prisma.event.create({
      data: {
        companyId,
        name: data.name,
        date: new Date(data.date),
        status: data.status || 'ACTIVE'
      }
    });
  }

  async findById(id: string, companyId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, companyId },
      include: {
        incomes: {
          include: { income: true }
        },
        expenses: {
          include: {
            expenseItems: {
              include: { expenseCategory: true, department: true }
            }
          }
        }
      }
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }

  async getFinancialSummary(id: string, companyId: string) {
    const event = await this.findById(id, companyId);
    
    let totalIncome = 0;
    event.incomes.forEach(i => {
      totalIncome += Number(i.amountApplied);
    });

    let totalExpense = 0;
    event.expenses.forEach(e => {
      totalExpense += Number(e.amountPaid);
    });

    return {
      totalIncome,
      totalExpense,
      grossProfit: totalIncome - totalExpense
    };
  }

  async getMonthlyReport(companyId: string) {
    const events = await this.prisma.event.findMany({
      where: { companyId },
      orderBy: { date: 'asc' },
      include: {
        incomes: { include: { income: true } },
        expenses: {
          include: {
            expenseItems: { include: { expenseCategory: true } }
          }
        }
      }
    });

    const report = events.map(event => {
      let ingreso = 0;
      let lastIncomeDate: Date | null = null;
      
      event.incomes.forEach(i => {
        ingreso += Number(i.amountApplied);
        if (!lastIncomeDate || i.income.paymentDate > lastIncomeDate) {
          lastIncomeDate = i.income.paymentDate;
        }
      });

      let nomina = 0;
      let viaticos = 0;
      let otros = 0;

      event.expenses.forEach(expense => {
        expense.expenseItems.forEach(item => {
          // Robust check for classification based on Category Match
          const catName = item.expenseCategory?.name.toUpperCase() || '';
          if (catName.includes('NOMINA') || catName.includes('NÓMINA')) {
            nomina += Number(item.amount);
          } else if (catName.includes('VIATICO') || catName.includes('VIÁTICO')) {
            viaticos += Number(item.amount);
          } else {
            otros += Number(item.amount);
          }
        });
      });

      const totalEgresos = nomina + viaticos + otros;
      
      return {
        id: event.id,
        date: event.date,
        name: event.name,
        ingreso,
        lastIncomeDate,
        nomina,
        viaticos,
        otrosGastos: otros,
        totalEgresos,
        profit: ingreso - totalEgresos
      };
    });

    return report;
  }
}
