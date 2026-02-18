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
  Query,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('purchase-orders')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
  @Permissions('purchase_orders.create')
  create(@Body() data: CreatePurchaseOrderDto, @Request() req) {
    return this.poService.create(req.user.companyId, req.user.id, data);
  }

  @Get()
  @Permissions('purchase_orders.view')
  findAll(@Request() req, @Query() pagination: PaginationDto = new PaginationDto()) {
    return this.poService.findAll(req.user.companyId, pagination || new PaginationDto());
  }

  @Get(':id')
  @Permissions('purchase_orders.view')
  findOne(@Param('id') id: string) {
    return this.poService.findOne(id);
  }

  @Patch(':id')
  @Permissions('purchase_orders.edit')
  update(@Param('id') id: string, @Body() data: UpdatePurchaseOrderDto, @Request() req) {
    return this.poService.update(id, req.user.id, data);
  }

  @Delete(':id')
  @Permissions('purchase_orders.delete')
  remove(@Param('id') id: string, @Request() req) {
    return this.poService.remove(req.user.id, id);
  }
}
