import { Module } from '@nestjs/common';
import { DocumentFormatsService } from './document-formats.service';
import { DocumentFormatsController } from './document-formats.controller';

@Module({
  controllers: [DocumentFormatsController],
  providers: [DocumentFormatsService],
  exports: [DocumentFormatsService],
})
export class DocumentFormatsModule {}
