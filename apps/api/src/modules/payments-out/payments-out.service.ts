import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsOutService {
  constructor(private prisma: PrismaService) {}

  // REGISTRAR EGRESO (PAGO A PROVEEDOR)
  async create(companyId: string, data: any) {
    const { 
      paymentDate, method, reference, bankName, 
      currencyCode, exchangeRate, amountPaid, // Monto total que sale del banco
      notes, 
      bills // Array de facturas que estamos pagando
    } = data;

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear el Registro de Egreso (Cabecera)
      // Generamos correlativo simple por ahora
      const paymentNumber = `EGR-${Date.now().toString().slice(-6)}`;

      const paymentOut = await tx.paymentOut.create({
        data: {
          companyId,
          paymentNumber,
          paymentDate: new Date(paymentDate),
          method,
          reference,
          bankName,
          currencyCode,
          exchangeRate,
          amountPaid,
          notes,
        },
      });

      // 2. Procesar cada Factura que se está matando/abando
      for (const item of bills) {
        const { purchaseBillId, amountApplied, retentionData } = item;

        // A. Verificar Factura
        const bill = await tx.purchaseBill.findUnique({ where: { id: purchaseBillId } });
        if (!bill || bill.companyId !== companyId) throw new BadRequestException("Factura inválida");

        // B. Actualizar Retenciones en la Factura (Si aplica)
        // A veces las retenciones se definen justo al momento de pagar
        if (retentionData) {
          await tx.purchaseBill.update({
            where: { id: purchaseBillId },
            data: {
              retentionIVA: retentionData.retentionIVA || bill.retentionIVA,
              rateRetIVA: retentionData.rateRetIVA || bill.rateRetIVA,
              receiptRetIVA: retentionData.receiptRetIVA || bill.receiptRetIVA,
              
              retentionISLR: retentionData.retentionISLR || bill.retentionISLR,
              rateRetISLR: retentionData.rateRetISLR || bill.rateRetISLR,
              receiptRetISLR: retentionData.receiptRetISLR || bill.receiptRetISLR,
              
              igtfAmount: retentionData.igtfAmount || bill.igtfAmount,
            }
          });
        }

        // C. Crear Detalle del Pago
        await tx.paymentOutDetail.create({
          data: {
            paymentOutId: paymentOut.id,
            purchaseBillId: purchaseBillId,
            amountApplied: amountApplied,
          }
        });

        // D. Actualizar Saldo de la Factura
        const newPaidAmount = Number(bill.paidAmount) + Number(amountApplied);
        
        // Determinar si se pagó completa (Considerando el total menos retenciones si fuera el caso, 
        // pero simplificado: si pagado >= total, status PAID)
        // OJO: En Venezuela, Total a Pagar = Total Factura - Retenciones + IGTF.
        // El sistema debe comparar contra ese "Neto a Pagar".
        
        // Recalculamos el "Neto Deuda" real de la factura con los datos actualizados
        // (Esto es una simplificación, idealmente se hace con precisión decimal)
        const currentBill = await tx.purchaseBill.findUnique({ where: { id: purchaseBillId } });
        const netPayable = Number(currentBill?.totalAmount || 0) 
                           - Number(currentBill?.retentionIVA || 0) 
                           - Number(currentBill?.retentionISLR || 0) 
                           + Number(currentBill?.igtfAmount || 0);

        let newStatus = bill.status;
        if (newPaidAmount >= netPayable - 0.01) { // Pequeño margen por decimales
            newStatus = 'PAID';
        }

        await tx.purchaseBill.update({
          where: { id: purchaseBillId },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus
          }
        });
      }

      return paymentOut;
    });
  }

  // Historial de Pagos
  async findAll(companyId: string) {
    return this.prisma.paymentOut.findMany({
      where: { companyId },
      include: {
        company: true, // Datos de la empresa (Agente de Retención)
        details: {
          include: { purchaseBill: { include: { supplier: true } } }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });
  }
}