import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SalesOrdersService } from './sales-orders.service';
import {
  CreateSalesOrderDto,
  UpdateSalesOrderStatusDto,
} from './dto/sales-order.dto';

@Controller('sales-orders')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class SalesOrdersController {
  constructor(private readonly service: SalesOrdersService) {}

  // POST /sales-orders  → Venta directa sin cotización previa
  @Post()
  @Permissions('sales.create')
  create(@Request() req: any, @Body() dto: CreateSalesOrderDto) {
    return this.service.create(req.user.companyId, req.user.id, dto);
  }

  // GET /sales-orders?page=1&status=CONFIRMED
  @Get()
  @Permissions('sales.view')
  findAll(
    @Request() req: any,
    @Query() query: { page?: number; status?: string },
  ) {
    return this.service.findAll(req.user.companyId, query);
  }

  // GET /sales-orders/pipeline  → Agrupado por status para dashboard
  @Get('pipeline')
  @Permissions('sales.view')
  getPipeline(@Request() req: any) {
    return this.service.getPipeline(req.user.companyId);
  }

  // GET /sales-orders/:id
  @Get(':id')
  @Permissions('sales.view')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.companyId, id);
  }

  // PATCH /sales-orders/:id/status  → Avanzar en el flujo o cancelar (repone stock)
  @Patch(':id/status')
  @Permissions('sales.edit')
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderStatusDto,
  ) {
    return this.service.updateStatus(req.user.companyId, id, dto);
  }
}
