import { Module } from '@nestjs/common';
import { ServiceCategoriesService } from './service-categories.service';
import { ServiceCategoriesController } from './service-categories.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceCategoriesController],
  providers: [ServiceCategoriesService],
  exports: [ServiceCategoriesService],
})
export class ServiceCategoriesModule {}
