import { Module } from '@nestjs/common';
import { IslrService } from './islr.service';
import { IslrController } from './islr.controller';

@Module({
  controllers: [IslrController],
  providers: [IslrService],
  exports: [IslrService], // Para ser consumido en la generación de pagos / facturas
})
export class IslrModule {}
