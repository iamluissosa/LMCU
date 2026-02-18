import { Module } from '@nestjs/common';
import { PurchaseBillsService } from './purchase-bills.service';
import { PurchaseBillsController } from './purchase-bills.controller';

import { PurchaseBillsRepository } from './purchase-bills.repository';

@Module({
  controllers: [PurchaseBillsController],
  providers: [PurchaseBillsService, PurchaseBillsRepository],
})
export class PurchaseBillsModule {}
