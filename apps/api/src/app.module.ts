import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './modules/products/products.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { GoodsReceiptsModule } from './modules/goods-receipts/goods-receipts.module';
import { PurchaseBillsModule } from './modules/purchase-bills/purchase-bills.module';
import { PaymentsOutModule } from './modules/payments-out/payments-out.module';
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module';
import { ExpenseCategoriesModule } from './modules/expense-categories/expense-categories.module';
import { SalesModule } from './modules/sales/sales.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ServiceCategoriesModule } from './modules/service-categories/service-categories.module';
import { IslrModule } from './modules/islr/islr.module';
import { DocumentFormatsModule } from './modules/document-formats/document-formats.module';
import { FiscalBooksModule } from './modules/fiscal-books/fiscal-books.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    CompaniesModule,
    UsersModule,
    DashboardModule,
    SettingsModule,
    SuppliersModule,
    PurchaseOrdersModule,
    GoodsReceiptsModule,
    PurchaseBillsModule,
    PaymentsOutModule,
    ExchangeRatesModule,
    ExpenseCategoriesModule,
    SalesModule,
    ClientsModule,
    ServiceCategoriesModule,
    IslrModule,
    DocumentFormatsModule,
    FiscalBooksModule,
    DepartmentsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
