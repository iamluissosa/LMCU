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
import { QuotesService } from './quotes.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  UpdateQuoteStatusDto,
} from './dto/quote.dto';

@Controller('quotes')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class QuotesController {
  constructor(private readonly service: QuotesService) {}

  // POST /quotes
  @Post()
  @Permissions('sales.create')
  create(@Request() req: any, @Body() dto: CreateQuoteDto) {
    return this.service.create(req.user.companyId, req.user.id, dto);
  }

  // GET /quotes?page=1&status=SENT
  @Get()
  @Permissions('sales.view')
  findAll(
    @Request() req: any,
    @Query() query: { page?: number; status?: string },
  ) {
    return this.service.findAll(req.user.companyId, query);
  }

  // GET /quotes/:id
  @Get(':id')
  @Permissions('sales.view')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.companyId, id);
  }

  // POST /quotes/:id/duplicate  → Copia una cotización existente como nuevo DRAFT
  @Post(':id/duplicate')
  @Permissions('sales.create')
  duplicate(@Request() req: any, @Param('id') id: string) {
    return this.service.duplicate(req.user.companyId, req.user.id, id);
  }

  // PATCH /quotes/:id  → Actualizar datos de cotización (solo DRAFT)
  @Patch(':id')
  @Permissions('sales.edit')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.service.update(req.user.companyId, id, dto);
  }

  // PATCH /quotes/:id/status  → { status: 'SENT' | 'ACCEPTED' | 'REJECTED' ... }
  @Patch(':id/status')
  @Permissions('sales.edit')
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteStatusDto,
  ) {
    return this.service.updateStatus(req.user.companyId, id, dto);
  }

  // POST /quotes/:id/convert  → Convierte a SalesOrder (valida y compromete stock)
  @Post(':id/convert')
  @Permissions('sales.create')
  convertToOrder(@Request() req: any, @Param('id') id: string) {
    return this.service.convertToOrder(req.user.companyId, req.user.id, id);
  }
}
