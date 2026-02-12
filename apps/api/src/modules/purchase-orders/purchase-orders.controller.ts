import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('purchase-orders')
@UseGuards(AuthGuard('jwt'))
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
  create(@Body() data: any, @Request() req) {
    return this.poService.create(req.user.companyId, data);
  }

  @Get()
  findAll(@Request() req) {
    return this.poService.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.poService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.poService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.poService.remove(id);
  }
}
