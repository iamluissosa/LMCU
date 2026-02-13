import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('purchase-orders')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
  @Permissions('purchase_orders.create')
  create(@Body() data: any, @Request() req) {
    return this.poService.create(req.user.companyId, data);
  }

  @Get()
  @Permissions('purchase_orders.view')
  findAll(@Request() req) {
    return this.poService.findAll(req.user.companyId);
  }

  @Get(':id')
  @Permissions('purchase_orders.view')
  findOne(@Param('id') id: string) {
    return this.poService.findOne(id);
  }

  @Patch(':id')
  @Permissions('purchase_orders.edit')
  update(@Param('id') id: string, @Body() data: any) {
    return this.poService.update(id, data);
  }

  @Delete(':id')
  @Permissions('purchase_orders.delete')
  remove(@Param('id') id: string) {
    return this.poService.remove(id);
  }
}
