import { Module } from '@nestjs/common';
import { PurchaseBillsService } from './purchase-bills.service';
import { PurchaseBillsController } from './purchase-bills.controller';

@Module({
  controllers: [PurchaseBillsController],
  providers: [PurchaseBillsService],
})
export class PurchaseBillsModule {}
