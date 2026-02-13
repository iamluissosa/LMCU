import { Controller, Get, Post, Body, UseGuards, Request, Delete, Param } from '@nestjs/common';
import { PurchaseBillsService } from './purchase-bills.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('bills')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PurchaseBillsController {
  constructor(private readonly billsService: PurchaseBillsService) {}

  @Post()
  @Permissions('bills.create')
  create(@Request() req, @Body() data: any) {
    return this.billsService.create(req.user.companyId, data);
  }

  @Get()
  @Permissions('bills.view')
  findAll(@Request() req) {
    return this.billsService.findAll(req.user.companyId);
  }

  @Delete(':id')
  @Permissions('bills.delete')
  remove(@Param('id') id: string) {
    return this.billsService.remove(id);
  }
}