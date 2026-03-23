import { Module } from '@nestjs/common';
import { FiscalBooksService } from './fiscal-books.service';
import { FiscalBooksController } from './fiscal-books.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FiscalBooksController],
  providers: [FiscalBooksService],
  exports: [FiscalBooksService],
})
export class FiscalBooksModule {}
