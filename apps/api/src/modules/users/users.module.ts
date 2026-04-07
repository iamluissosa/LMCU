import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CompaniesModule } from '../companies/companies.module';
import { SettingsModule } from '../settings/settings.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [CompaniesModule, SettingsModule, PrismaModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
