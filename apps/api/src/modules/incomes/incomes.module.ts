import { Module } from '@nestjs/common';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [IncomesController],
  providers: [IncomesService, PrismaService],
  exports: [IncomesService]
})
export class IncomesModule {}
