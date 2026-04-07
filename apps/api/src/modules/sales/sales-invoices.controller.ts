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
import { SalesInvoicesService } from './sales-invoices.service';
import {
  CreateSalesInvoiceDto,
  RegisterPaymentInDto,
} from './dto/sales-invoice.dto';

@Controller('sales-invoices')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class SalesInvoicesController {
  constructor(private readonly service: SalesInvoicesService) {}

  // POST /sales-invoices
  @Post()
  @Permissions('sales.invoice')
  create(@Request() req: any, @Body() dto: CreateSalesInvoiceDto) {
    return this.service.create(req.user.companyId, req.user.id, dto);
  }

  // POST /sales-invoices/payment  → Registrar cobro (PaymentIn)
  @Post('payment')
  @Permissions('sales.invoice')
  registerPayment(@Request() req: any, @Body() dto: RegisterPaymentInDto) {
    return this.service.registerPayment(req.user.companyId, req.user.id, dto);
  }

  // GET /sales-invoices?page=1&status=ISSUED&clientId=xxx
  @Get()
  @Permissions('sales.view')
  findAll(
    @Request() req: any,
    @Query() query: { page?: number; status?: string; clientId?: string },
  ) {
    return this.service.findAll(req.user.companyId, query);
  }

  // GET /sales-invoices/overdue  → Facturas vencidas (para alertas en dashboard)
  @Get('overdue')
  @Permissions('sales.view')
  getOverdue(@Request() req: any) {
    return this.service.getOverdue(req.user.companyId);
  }

  // GET /sales-invoices/book?year=2026&month=3  → Libro de Ventas SENIAT
  @Get('book')
  @Permissions('sales.view')
  getSalesBook(
    @Request() req: any,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.service.getSalesBook(
      req.user.companyId,
      Number(year) || new Date().getFullYear(),
      Number(month) || new Date().getMonth() + 1,
    );
  }

  // PATCH /sales-invoices/:id/void — Anular factura (Prov. 0071 Art. 22 SENIAT)
  @Patch(':id/void')
  @Permissions('sales.invoice')
  voidInvoice(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.service.voidInvoice(
      req.user.companyId,
      req.user.id,
      id,
      reason ?? 'Anulada por el usuario',
    );
  }

  // GET /sales-invoices/:id
  @Get(':id')
  @Permissions('sales.view')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.companyId, id);
  }
}
