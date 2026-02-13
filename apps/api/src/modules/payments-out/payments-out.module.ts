import { Module } from '@nestjs/common';
import { PaymentsOutService } from './payments-out.service';
import { PaymentsOutController } from './payments-out.controller';

@Module({
  controllers: [PaymentsOutController],
  providers: [PaymentsOutService],
})
export class PaymentsOutModule {}
