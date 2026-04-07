import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesInvoicesController } from './sales-invoices.controller';

import { QuotesService } from './quotes.service';
import { SalesOrdersService } from './sales-orders.service';
import { SalesInvoicesService } from './sales-invoices.service';

@Module({
  controllers: [
    QuotesController,
    SalesOrdersController,
    SalesInvoicesController,
  ],
  providers: [QuotesService, SalesOrdersService, SalesInvoicesService],
  exports: [
    SalesInvoicesService, // Exportado para el dashboard/reportes
  ],
})
export class SalesModule {}
