import { Module } from '@nestjs/common';
import { PurchaseBillsService } from './purchase-bills.service';
import { PurchaseBillsController } from './purchase-bills.controller';

import { PurchaseBillsRepository } from './purchase-bills.repository';
import { IslrModule } from '../islr/islr.module';

@Module({
  imports: [IslrModule],
  controllers: [PurchaseBillsController],
  providers: [PurchaseBillsService, PurchaseBillsRepository],
})
export class PurchaseBillsModule {}
