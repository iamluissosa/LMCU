import { Controller, Get, Post, Body, UseGuards, Request, Delete, Param, Query } from '@nestjs/common';
import { PurchaseBillsService } from './purchase-bills.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreatePurchaseBillDto } from './dto/create-purchase-bill.dto';
import { PurchaseBill } from '@erp/types';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('bills')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PurchaseBillsController {
  constructor(private readonly billsService: PurchaseBillsService) {}

  @Post()
  @Permissions('bills.create')
  async create(@Request() req, @Body() data: CreatePurchaseBillDto): Promise<PurchaseBill> {
    return this.billsService.create(req.user.companyId, req.user.id, data);
  }

  @Get()
  @Permissions('bills.view')
  async findAll(@Request() req, @Query() pagination: PaginationDto = new PaginationDto()) {
    return this.billsService.findAll(req.user.companyId, pagination || new PaginationDto());
  }

  @Delete(':id')
  @Permissions('bills.delete')
  async remove(@Request() req, @Param('id') id: string): Promise<PurchaseBill> {
    return this.billsService.remove(req.user.companyId, req.user.id, id);
  }
}