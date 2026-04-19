import { Module } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';
import { CommissionCalculatorService } from './commission-calculator.service';
import { CommissionListenerService } from './commission-listener.service';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [SalesModule],
  controllers: [CommissionsController],
  providers: [
    CommissionsService,
    CommissionCalculatorService,
    CommissionListenerService,
  ],
  exports: [CommissionsService, CommissionCalculatorService],
})
export class CommissionsModule {}
