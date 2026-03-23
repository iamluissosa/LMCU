import {
  Controller, Get, Post, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FiscalBooksService } from './fiscal-books.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { CreateDebitNoteDto } from './dto/create-debit-note.dto';
import { RegisterIvaRetentionReceivedDto } from './dto/register-iva-retention-received.dto';

@Controller('fiscal-books')
@UseGuards(AuthGuard('jwt'))
export class FiscalBooksController {
  constructor(private readonly fiscalBooksService: FiscalBooksService) {}

  // ── Libro de Ventas ──────────────────────────────────────────
  @Get('sales-book')
  async getSalesBook(
    @Request() req: { user: { companyId: string } },
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return { error: 'Parámetros year y month son requeridos (month: 1-12)' };
    }
    return this.fiscalBooksService.generateSalesBook(req.user.companyId, y, m);
  }

  // ── Libro de Compras ─────────────────────────────────────────
  @Get('purchase-book')
  async getPurchaseBook(
    @Request() req: { user: { companyId: string } },
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return { error: 'Parámetros year y month son requeridos (month: 1-12)' };
    }
    return this.fiscalBooksService.generatePurchaseBook(req.user.companyId, y, m);
  }

  // ── Notas de Crédito ─────────────────────────────────────────
  @Post('credit-notes')
  async createCreditNote(@Body() dto: CreateCreditNoteDto) {
    return this.fiscalBooksService.createCreditNote(dto);
  }

  // ── Notas de Débito ──────────────────────────────────────────
  @Post('debit-notes')
  async createDebitNote(@Body() dto: CreateDebitNoteDto) {
    return this.fiscalBooksService.createDebitNote(dto);
  }

  // ── Retenciones IVA Recibidas de Clientes ───────────────────
  @Post('iva-retentions-received')
  async registerIvaRetentionReceived(@Body() dto: RegisterIvaRetentionReceivedDto) {
    return this.fiscalBooksService.registerIvaRetentionReceived(dto);
  }

  @Get('iva-retentions-received')
  async getIvaRetentionsReceived(
    @Request() req: { user: { companyId: string } },
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const y = year ? parseInt(year, 10) : undefined;
    const m = month ? parseInt(month, 10) : undefined;
    return this.fiscalBooksService.findAllIvaRetentionsReceived(req.user.companyId, y, m);
  }
}
