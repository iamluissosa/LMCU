import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CommissionCalculatorService } from './commission-calculator.service';

@Injectable()
export class CommissionListenerService {
  constructor(private readonly calculator: CommissionCalculatorService) {}

  @OnEvent('payment.registered')
  async handlePaymentRegistered(payload: {
    paymentId: string;
    invoiceId: string;
    companyId: string;
    amountApplied: number;
    paymentDate: Date;
  }) {
    await this.calculator.calculateAndRecordCommission(payload);
  }

  @OnEvent('invoice.voided')
  async handleInvoiceVoided(payload: {
    invoiceId: string;
    companyId: string;
    voidDate: Date;
  }) {
    // Si la factura se anula por completo, 100% de la comisión ya ganada hace clawback
    await this.calculator.calculateClawback({
      companyId: payload.companyId,
      invoiceId: payload.invoiceId,
      clawbackProportion: 1.0, 
      date: payload.voidDate,
    });
  }

}
