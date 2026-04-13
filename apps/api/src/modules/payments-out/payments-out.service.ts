import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentOutDto } from './dto/create-payments-out.dto';
import { Prisma } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class PaymentsOutService {
  constructor(private prisma: PrismaService) {}

  // REGISTRAR EGRESO (PAGO A PROVEEDOR)
  async create(companyId: string, userId: string, data: CreatePaymentOutDto) {
      const {
        paymentDate,
        method,
        reference,
        bankName,
        currencyCode,
        exchangeRate,
        amountPaid, // Monto total que sale del banco
        notes,
        supplierId, // Nuevo campo
        bills = [], // Array de facturas que estamos pagando
        isDirectExpense,
        expenseItems = [],
        eventId,
      } = data;

      // ✅ Q-01: Generar número de pago usando secuencia segura

      try {
        return await this.prisma.$transaction(async (tx) => {
          const paymentNumber = await this.generatePaymentNumber(companyId, tx);
          // 1. Crear el Registro de Egreso (Cabecera)
          const paymentOut = await tx.paymentOut.create({
            data: {
              companyId,
              ...(userId ? { userId, createdById: userId, updatedById: userId } : {}),
              ...(supplierId ? { supplierId } : {}),
              paymentNumber,
              paymentDate: new Date(paymentDate),
              method: method as any, // Cast necesario por conflicto de tipos en entorno dev (EPERM en prisma generate)
              reference,
              bankName,
              currencyCode,
              exchangeRate,
              amountPaid,
              notes,
              isDirectExpense: isDirectExpense || false,
              ...(eventId ? { eventId } : {}),
            } as any, // Cast por EPERM audit fields
          });

        if (isDirectExpense) {
          // Guardar líneas de egreso directo
          if (expenseItems.length > 0) {
            await tx.paymentOutExpenseItem.createMany({
              data: expenseItems.map(item => ({
                paymentOutId: paymentOut.id,
                expenseCategoryId: item.expenseCategoryId,
                departmentId: item.departmentId,
                description: item.description,
                amount: item.amount,
              }))
            });
          }
        } else {
          // 2. Procesar cada Factura que se está matando/abando
          for (const [index, item] of bills.entries()) {
          try {
            const { purchaseBillId, amountApplied, retentionData } = item;

            // A. Verificar Factura
            const bill = await tx.purchaseBill.findUnique({
              where: { id: purchaseBillId },
            });
            if (!bill)
              throw new BadRequestException(
                `La factura con ID ${purchaseBillId} no existe.`,
              );
            if (bill.companyId !== companyId)
              throw new BadRequestException(
                `La factura ${bill.invoiceNumber} no pertenece a esta empresa.`,
              );

            // B. Actualizar Retenciones en la Factura (Si aplica)
            // B. Actualizar Retenciones en la Factura (Si aplica)
            if (retentionData) {
              // ✅ Q-01: Generar número de retención IVA si aplica y no existe
              let receiptRetIVA =
                retentionData.receiptRetIVA || bill.receiptRetIVA;
              if (Number(retentionData.retentionIVA) > 0 && !receiptRetIVA) {
                receiptRetIVA = await this.generateRetentionReceiptNumber(
                  companyId,
                  'IVA',
                  tx,
                );
              }

              // ✅ Q-01: Generar número de retención ISLR si aplica y no existe
              let receiptRetISLR =
                retentionData.receiptRetISLR || bill.receiptRetISLR;
              if (Number(retentionData.retentionISLR) > 0 && !receiptRetISLR) {
                receiptRetISLR = await this.generateRetentionReceiptNumber(
                  companyId,
                  'ISLR',
                  tx,
                );
              }

              await tx.purchaseBill.update({
                where: { id: purchaseBillId },
                data: {
                  retentionIVA: retentionData.retentionIVA || bill.retentionIVA,
                  rateRetIVA: retentionData.rateRetIVA || bill.rateRetIVA,
                  receiptRetIVA: receiptRetIVA,

                  retentionISLR:
                    retentionData.retentionISLR || bill.retentionISLR,
                  rateRetISLR: retentionData.rateRetISLR || bill.rateRetISLR,
                  receiptRetISLR: receiptRetISLR,

                  igtfAmount: retentionData.igtfAmount || bill.igtfAmount,
                },
              });

              // ✅ Crear registro IslrRetention si hay retención ISLR con datos del concepto
              if (
                Number(retentionData.retentionISLR) > 0 &&
                receiptRetISLR &&
                retentionData.islrConceptId
              ) {
                // Evitar duplicados: verificar si ya existe un registro con este controlNumber
                const existing = await tx.islrRetention.findUnique({
                  where: { controlNumber: receiptRetISLR },
                });
                if (!existing) {
                  await tx.islrRetention.create({
                    data: {
                      controlNumber: receiptRetISLR,
                      supplierId: bill.supplierId,
                      companyId: companyId,
                      conceptId: retentionData.islrConceptId,
                      retentionDate: new Date(),
                      totalInvoice: retentionData.islrTotalInvoice || Number(bill.totalAmount),
                      taxableBase: retentionData.islrTaxableBase || 0,
                      percentage: retentionData.islrPercentage || 0,
                      sustraendo: retentionData.islrSustraendo || 0,
                      retainedAmount: Number(retentionData.retentionISLR),
                    },
                  });
                }
              }
            }

            // C. Crear Detalle del Pago
            await tx.paymentOutDetail.create({
              data: {
                paymentOutId: paymentOut.id,
                purchaseBillId: purchaseBillId,
                amountApplied: amountApplied,
              },
            });

            // D. Actualizar Saldo de la Factura
            // Recalculamos el "Neto Deuda" real de la factura con los datos actualizados
            const currentBill = await tx.purchaseBill.findUnique({
              where: { id: purchaseBillId },
            });
            const netPayable =
              Number(currentBill?.totalAmount || 0) -
              Number(currentBill?.retentionIVA || 0) -
              Number(currentBill?.retentionISLR || 0) +
              Number(currentBill?.igtfAmount || 0);

            const newPaidAmount =
              Number(currentBill?.paidAmount || 0) + Number(amountApplied);

            let newStatus = currentBill?.status;
            // Pequeño margen por decimales (epsilon)
            if (newPaidAmount >= netPayable - 0.01) {
              newStatus = 'PAID';
            }

            await tx.purchaseBill.update({
              where: { id: purchaseBillId },
              data: {
                paidAmount: newPaidAmount,
                status: newStatus,
              },
            });
          } catch (error) {
            console.error(
              `Error procesando factura en índice ${index}:`,
              error,
            );
            throw new BadRequestException(
              `Error al procesar la factura #${index + 1} (${item.purchaseBillId}): ${error.message}`,
            );
          }
        }
        }

        return paymentOut;
      });
    } catch (error: any) {
      console.error('Error creating payment out:', error);
      throw new BadRequestException(
        error.stack || error.message || 'Error al registrar el egreso',
      );
    }
  }

  // Obtener Egreso
  async findOne(companyId: string, id: string) {
    const payment = await this.prisma.paymentOut.findUnique({
      where: { id, companyId },
      include: {
        expenseItems: {
          include: {
            expenseCategory: true,
            department: true,
          }
        },
        supplier: true,
        details: true,
      }
    });

    if (!payment) {
      throw new BadRequestException('Egreso no encontrado');
    }

    return payment;
  }

  // Editar Egreso (Solo Gastos Directos)
  async update(companyId: string, userId: string, id: string, data: any) {
    const {
      paymentDate, reference, bankName, method, currencyCode, amountPaid, notes, supplierId, expenseItems = []
    } = data;

    const existing = await this.prisma.paymentOut.findUnique({
      where: { id, companyId },
      include: { details: true }
    });

    if (!existing) {
      throw new BadRequestException('Egreso no encontrado');
    }

    if (!existing.isDirectExpense) {
      throw new BadRequestException('No se puede modificar un egreso vinculado a facturas o compras. Solo aplica para gastos directos.');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Actualizar Cabecera
      const updated = await tx.paymentOut.update({
        where: { id },
        data: {
          ...(userId ? { updatedById: userId } : {}),
          ...(supplierId !== undefined ? { supplierId } : {}),
          ...(paymentDate ? { paymentDate: new Date(paymentDate) } : {}),
          ...(method ? { method: method as any } : {}),
          ...(reference !== undefined ? { reference } : {}),
          ...(bankName !== undefined ? { bankName } : {}),
          ...(currencyCode ? { currencyCode } : {}),
          ...(amountPaid !== undefined ? { amountPaid } : {}),
          ...(notes !== undefined ? { notes } : {}),
        } as any
      });

      // 2. Reemplazar líneas de gasto
      if (expenseItems.length > 0) {
        await tx.paymentOutExpenseItem.deleteMany({
          where: { paymentOutId: id }
        });

        await tx.paymentOutExpenseItem.createMany({
          data: expenseItems.map((item: any) => ({
            paymentOutId: id,
            expenseCategoryId: item.expenseCategoryId || null,
            departmentId: item.departmentId || null,
            description: item.description,
            amount: item.amount,
          }))
        });
      }

      return updated;
    });
  }

  // Eliminar Egreso (Soft Delete, Solo Gastos Directos)
  async remove(companyId: string, userId: string, id: string) {
    const existing = await this.prisma.paymentOut.findUnique({
      where: { id, companyId },
    });

    if (!existing) {
      throw new BadRequestException('Egreso no encontrado');
    }

    if (!existing.isDirectExpense) {
      throw new BadRequestException('No se puede eliminar un egreso vinculado a facturas o compras por esta vía.');
    }

    return await this.prisma.paymentOut.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        ...(userId ? { updatedById: userId } : {})
      } as any
    });
  }

  // Vincular a un evento (Ruta PATCH /payments-out/:id/link-event)
  async linkEvent(companyId: string, userId: string, id: string, eventId: string | null) {
    const existing = await this.prisma.paymentOut.findUnique({
      where: { id, companyId },
    });

    if (!existing) {
      throw new BadRequestException('Egreso no encontrado');
    }

    if (!existing.isDirectExpense) {
      throw new BadRequestException('Solo se pueden vincular a eventos los gastos directos (Operacionales).');
    }

    return await this.prisma.paymentOut.update({
      where: { id },
      data: {
        eventId,
        ...(userId ? { updatedById: userId } : {})
      } as any
    });
  }

  // Historial de Pagos
  async findAll(
    companyId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20 } = pagination || {}; // Safety default
    const skip = (page - 1) * limit;

    // Safety check for Prisma Client sync issues (EPERM)
    if (!this.prisma.paymentOut) {
      throw new BadRequestException(
        'Prisma Client is out of sync (PaymentOut model missing). Please restart server and run prisma generate.',
      );
    }

    try {
      const [payments, total] = await Promise.all([
        this.prisma.paymentOut.findMany({
          where: {
            companyId,
            deletedAt: null,
          } as any,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            paymentNumber: true,
            paymentDate: true,
            amountPaid: true,
            method: true,
            reference: true,
            bankName: true,
            currencyCode: true,
            exchangeRate: true,
            notes: true,
            createdAt: true,
            supplier: {
              select: {
                id: true,
                name: true,
                rif: true
              }
            },
            company: {
              select: {
                name: true,
                rif: true,
                address: true,
                logoUrl: true,
              },
            },
            details: {
              select: {
                id: true,
                amountApplied: true,
                purchaseBill: {
                  select: {
                    id: true,
                    invoiceNumber: true,
                    controlNumber: true,
                    totalAmount: true,
                    issueDate: true,
                    taxableAmount: true,
                    taxRate: true,
                    taxAmount: true,
                    retentionIVA: true,
                    receiptRetIVA: true,
                    retentionISLR: true,
                    rateRetIVA: true,
                    receiptRetISLR: true,
                    igtfAmount: true,
                    supplier: {
                      select: {
                        id: true,
                        name: true,
                        rif: true,
                        address: true,
                      },
                    },
                  },
                },
              },
            },
            isDirectExpense: true,
            expenseItems: {
              select: {
                id: true,
                description: true,
                amount: true,
                expenseCategory: {
                  select: { id: true, name: true }
                },
                department: {
                  select: { id: true, name: true, code: true }
                }
              }
            }
          },
        }),
        this.prisma.paymentOut.count({
          where: {
            companyId,
            deletedAt: null,
          } as any,
        }),
      ]);

      return {
        items: payments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      throw new BadRequestException(
        `Error fetching payments: ${error.message}`,
      );
    }
  }

  // ✅ Q-01: Generar número de pago seguro y correlativo
  async generatePaymentNumber(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const operation = async (client: Prisma.TransactionClient) => {
      // 1. Obtener o crear configuración de la empresa
      let settings = await client.companySettings.findUnique({
        where: { companyId },
      });

      if (!settings) {
        // Crear configuración por defecto si no existe
        settings = await client.companySettings.create({
          data: {
            companyId,
            nextPaymentOutNumber: 1,
            paymentOutPrefix: 'EGR-',
            fiscalYear: new Date().getFullYear(),
            // Campos obligatorios del schema
            invoicePrefix: 'FACT-',
            nextInvoiceNumber: 1,
            productPrefix: 'PROD-',
            nextProductCode: 1,
            purchaseOrderPrefix: 'OC-',
            nextPurchaseOrder: 1,
          },
        });
      }

      // 2. Generar número con formato: EGR-000001
      const paymentNumber = `${settings.paymentOutPrefix}${String(settings.nextPaymentOutNumber).padStart(6, '0')}`;

      // 3. Incrementar contador de forma atómica
      await client.companySettings.update({
        where: { companyId },
        data: { nextPaymentOutNumber: settings.nextPaymentOutNumber + 1 },
      });

      return paymentNumber;
    };

    if (tx) {
      return operation(tx);
    } else {
      return this.prisma.$transaction(operation);
    }
  }

  // ✅ Q-01: Generar número de comprobante de retención (formato SENIAT)
  async generateRetentionReceiptNumber(
    companyId: string,
    type: 'IVA' | 'ISLR',
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const operation = async (client: Prisma.TransactionClient) => {
      const settings = await client.companySettings.findUnique({
        where: { companyId },
      });

      if (!settings)
        throw new BadRequestException(
          'Configuración de empresa no encontrada. Debe crear un pago primero.',
        );

      const year = settings.fiscalYear;
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      let sequence = 0;
      let fieldToUpdate = '';

      if (type === 'IVA') {
        sequence = settings.nextRetentionIVANumber;
        fieldToUpdate = 'nextRetentionIVANumber';
      } else {
        sequence = settings.nextRetentionISLRNumber;
        fieldToUpdate = 'nextRetentionISLRNumber';
      }

      // Formato: YYYYMM + 8 dígitos (YYYYMM00000001)
      const receiptNumber = `${year}${month}${String(sequence).padStart(8, '0')}`;

      await client.companySettings.update({
        where: { companyId },
        data: { [fieldToUpdate]: sequence + 1 },
      });

      return receiptNumber;
    };

    if (tx) {
      return operation(tx);
    } else {
      return this.prisma.$transaction(operation);
    }
  }
}
