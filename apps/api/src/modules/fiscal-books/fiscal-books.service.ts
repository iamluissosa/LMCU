import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { CreateDebitNoteDto } from './dto/create-debit-note.dto';
import { RegisterIvaRetentionReceivedDto } from './dto/register-iva-retention-received.dto';

// ─────────────────────────────────────────────────────────────
// UTILIDAD FISCAL: Redondeo "medio hacia arriba" 2 decimales
// Art. 14 Reglamento Ley IVA — discrepancias de ±0.01 Bs en
// libros son causal de reparos fiscales.
// ─────────────────────────────────────────────────────────────
export function roundFiscal(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// La conversión se hace SIEMPRE con la tasa del documento (no la del día del reporte)
function toVes(amount: number, exchangeRate: number): number {
  return roundFiscal(amount * exchangeRate);
}

@Injectable()
export class FiscalBooksService {
  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════
  // 📒 LIBRO DE VENTAS
  // Prov. 0071 | Prov. 0049 Retenciones IVA
  // ══════════════════════════════════════════
  async generateSalesBook(companyId: string, year: number, month: number) {
    const [invoices, creditNotes, debitNotes] = await Promise.all([
      // 1. Facturas del período (ISSUED, PARTIAL, PAID, VOID — todas aparecen)
      this.prisma.salesInvoice.findMany({
        where: { companyId, fiscalYear: year, fiscalMonth: month, inBook: true },
        include: {
          client: { select: { name: true, rif: true } },
          ivaRetentionsReceived: true,
        },
        orderBy: { invoiceNumber: 'asc' },
      }),
      // 2. Notas de Crédito emitidas en el período (incluye extemporáneas)
      this.prisma.creditNote.findMany({
        where: {
          companyId, fiscalYear: year, fiscalMonth: month, inBook: true,
          affectedSalesInvoiceId: { not: null }, // Solo las de ventas
        },
        include: {
          affectedSalesInvoice: { select: { invoiceNumber: true, controlNumber: true } },
        },
        orderBy: { issueDate: 'asc' },
      }),
      // 3. Notas de Débito del período
      this.prisma.debitNote.findMany({
        where: { companyId, fiscalYear: year, fiscalMonth: month, inBook: true },
        include: {
          affectedSalesInvoice: { select: { invoiceNumber: true } },
        },
        orderBy: { issueDate: 'asc' },
      }),
    ]);

    // Combinar en orden cronológico y asignar Nro. de Operación correlativo
    const rows: SalesBookRow[] = [];
    let opNum = 1;

    for (const inv of invoices) {
      rows.push(this.mapInvoiceToSalesRow(inv, opNum++));
    }
    for (const cn of creditNotes) {
      rows.push(this.mapCreditNoteToSalesRow(cn, opNum++));
    }
    for (const dn of debitNotes) {
      rows.push(this.mapDebitNoteToSalesRow(dn, opNum++));
    }

    // Ordenar por fecha de documento
    rows.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    // Re-numerar el Nro. Operación tras el sort
    rows.forEach((r, i) => { r.nroOperacion = i + 1; });

    return {
      periodo: `${year}-${String(month).padStart(2, '0')}`,
      totalRegistros: rows.length,
      totales: this.calcSalesTotals(rows),
      rows,
    };
  }

  private mapInvoiceToSalesRow(inv: any, opNumber: number): SalesBookRow {
    const isVoid = inv.status === 'VOID';
    const fx = Number(inv.exchangeRate);
    const ret = inv.ivaRetentionsReceived?.[0];

    return {
      nroOperacion:   opNumber,
      fecha:          inv.issueDate,
      tipoDoc:        isVoid ? 'ANULADA' : 'FACT',
      rif:            inv.client?.rif ?? '',
      razonSocial:    inv.client?.name ?? '',
      nroFactura:     inv.invoiceNumber,
      nroControl:     inv.controlNumber ?? '',
      nroNotaDebito:   '',
      nroNotaCredito:  '',
      nroAfectada:    '',
      // VOID: todos los montos son 0.00 obligatoriamente (Prov. 0071 Art. 22)
      totalConIva:    isVoid ? 0 : toVes(Number(inv.totalAmount), fx),
      baseExenta:     isVoid ? 0 : toVes(Number(inv.exemptAmount), fx),
      base8:          isVoid ? 0 : toVes(Number(inv.taxableAmount8 ?? 0), fx),
      iva8:           isVoid ? 0 : toVes(Number(inv.taxAmount8 ?? 0), fx),
      base16:         isVoid ? 0 : toVes(Number(inv.taxableAmount16 ?? inv.taxableAmount ?? 0), fx),
      iva16:          isVoid ? 0 : toVes(Number(inv.taxAmount16 ?? inv.taxAmount ?? 0), fx),
      base31:         isVoid ? 0 : toVes(Number(inv.taxableAmount31 ?? 0), fx),
      iva31:          isVoid ? 0 : toVes(Number(inv.taxAmount31 ?? 0), fx),
      igtf:           isVoid ? 0 : toVes(Number(inv.igtfAmount ?? 0), fx),
      nroCompRet:     isVoid ? '' : (ret?.controlNumber ?? ''),
      fechaRet:       isVoid ? null : (ret?.retentionDate ?? null),
      montoRet:       isVoid ? 0 : roundFiscal(Number(ret?.retainedAmount ?? 0)),
    };
  }

  private mapCreditNoteToSalesRow(cn: any, opNumber: number): SalesBookRow {
    const fx = Number(cn.exchangeRate);
    return {
      nroOperacion:    opNumber,
      fecha:           cn.issueDate,
      tipoDoc:         'NC',
      rif:             '',
      razonSocial:     '',
      nroFactura:      cn.noteNumber,
      nroControl:      cn.controlNumber ?? '',
      nroNotaDebito:   '',
      nroNotaCredito:  cn.noteNumber,
      nroAfectada:     cn.affectedSalesInvoice?.invoiceNumber ?? '',
      totalConIva:     toVes(Number(cn.totalAmount), fx),
      baseExenta:      toVes(Number(cn.exemptAmount ?? 0), fx),
      base8:           toVes(Number(cn.taxableAmount8 ?? 0), fx),
      iva8:            toVes(Number(cn.taxAmount8 ?? 0), fx),
      base16:          toVes(Number(cn.taxableAmount16 ?? 0), fx),
      iva16:           toVes(Number(cn.taxAmount16 ?? 0), fx),
      base31:          0,
      iva31:           0,
      igtf:            0,
      nroCompRet:      '',
      fechaRet:        null,
      montoRet:        0,
    };
  }

  private mapDebitNoteToSalesRow(dn: any, opNumber: number): SalesBookRow {
    const fx = Number(dn.exchangeRate);
    return {
      nroOperacion:    opNumber,
      fecha:           dn.issueDate,
      tipoDoc:         'ND',
      rif:             '',
      razonSocial:     '',
      nroFactura:      dn.noteNumber,
      nroControl:      dn.controlNumber ?? '',
      nroNotaDebito:   dn.noteNumber,
      nroNotaCredito:  '',
      nroAfectada:     dn.affectedSalesInvoice?.invoiceNumber ?? '',
      totalConIva:     toVes(Number(dn.totalAmount), fx),
      baseExenta:      toVes(Number(dn.exemptAmount ?? 0), fx),
      base8:           toVes(Number(dn.taxableAmount8 ?? 0), fx),
      iva8:            toVes(Number(dn.taxAmount8 ?? 0), fx),
      base16:          toVes(Number(dn.taxableAmount16 ?? 0), fx),
      iva16:           toVes(Number(dn.taxAmount16 ?? 0), fx),
      base31:          0,
      iva31:           0,
      igtf:            0,
      nroCompRet:      '',
      fechaRet:        null,
      montoRet:        0,
    };
  }

  private calcSalesTotals(rows: SalesBookRow[]) {
    return {
      totalConIva:  roundFiscal(rows.reduce((s, r) => s + r.totalConIva, 0)),
      baseExenta:   roundFiscal(rows.reduce((s, r) => s + r.baseExenta, 0)),
      base8:        roundFiscal(rows.reduce((s, r) => s + r.base8, 0)),
      iva8:         roundFiscal(rows.reduce((s, r) => s + r.iva8, 0)),
      base16:       roundFiscal(rows.reduce((s, r) => s + r.base16, 0)),
      iva16:        roundFiscal(rows.reduce((s, r) => s + r.iva16, 0)),
      base31:       roundFiscal(rows.reduce((s, r) => s + r.base31, 0)),
      iva31:        roundFiscal(rows.reduce((s, r) => s + r.iva31, 0)),
      igtf:         roundFiscal(rows.reduce((s, r) => s + r.igtf, 0)),
      montoRet:     roundFiscal(rows.reduce((s, r) => s + r.montoRet, 0)),
    };
  }

  // ══════════════════════════════════════════
  // 📒 LIBRO DE COMPRAS
  // ══════════════════════════════════════════
  async generatePurchaseBook(companyId: string, year: number, month: number) {
    const [bills, creditNotes] = await Promise.all([
      this.prisma.purchaseBill.findMany({
        where: { companyId, fiscalYear: year, fiscalMonth: month, inBook: true },
        include: {
          supplier: { select: { name: true, rif: true } },
        },
        orderBy: { invoiceNumber: 'asc' },
      }),
      // NC de compras (proveedor nos emite NC)
      this.prisma.creditNote.findMany({
        where: {
          companyId, fiscalYear: year, fiscalMonth: month, inBook: true,
          affectedPurchaseBillId: { not: null },
        },
        include: {
          affectedPurchaseBill: { select: { invoiceNumber: true, controlNumber: true } },
        },
        orderBy: { issueDate: 'asc' },
      }),
    ]);

    const rows: PurchaseBookRow[] = [];
    let opNum = 1;

    for (const bill of bills) {
      rows.push(this.mapBillToPurchaseRow(bill, opNum++));
    }
    for (const cn of creditNotes) {
      rows.push(this.mapCreditNoteToPurchaseRow(cn, opNum++));
    }

    rows.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    rows.forEach((r, i) => { r.nroOperacion = i + 1; });

    return {
      periodo: `${year}-${String(month).padStart(2, '0')}`,
      totalRegistros: rows.length,
      totales: this.calcPurchaseTotals(rows),
      rows,
    };
  }

  private mapBillToPurchaseRow(bill: any, opNumber: number): PurchaseBookRow {
    const isVoid = bill.status === 'VOID';
    const fx = Number(bill.exchangeRate);
    return {
      nroOperacion:          opNumber,
      fecha:                 bill.issueDate,
      tipoDoc:               isVoid ? 'ANULADA' : 'FACT',
      rifProveedor:          bill.supplier?.rif ?? '',
      nombreProveedor:       bill.supplier?.name ?? '',
      nroFactura:            bill.invoiceNumber,
      nroControl:            bill.controlNumber ?? '',
      nroNotaCredito:        '',
      nroNotaDebito:         '',
      nroPlanillaImport:     bill.importDocketNumber ?? '',
      nroExpedienteAduana:   bill.customsExpedientNumber ?? '',
      totalConIva:           isVoid ? 0 : toVes(Number(bill.totalAmount), fx),
      sinDerechoCF:          isVoid ? 0 : toVes(Number(bill.noTaxCreditAmt ?? 0), fx),
      baseExenta:            isVoid ? 0 : toVes(Number(bill.exemptAmount), fx),
      base8:                 isVoid ? 0 : toVes(Number(bill.taxableAmount8 ?? 0), fx),
      iva8:                  isVoid ? 0 : toVes(Number(bill.taxAmount8 ?? 0), fx),
      base16:                isVoid ? 0 : toVes(Number(bill.taxableAmount16 ?? bill.taxableAmount ?? 0), fx),
      iva16:                 isVoid ? 0 : toVes(Number(bill.taxAmount16 ?? bill.taxAmount ?? 0), fx),
      nroCompRetIva:         isVoid ? '' : (bill.receiptRetIVA ?? ''),
      montoRetIva:           isVoid ? 0 : roundFiscal(Number(bill.retentionIVA ?? 0)),
      nroCompRetIslr:        isVoid ? '' : (bill.receiptRetISLR ?? ''),
      montoRetIslr:          isVoid ? 0 : roundFiscal(Number(bill.retentionISLR ?? 0)),
    };
  }

  private mapCreditNoteToPurchaseRow(cn: any, opNumber: number): PurchaseBookRow {
    const fx = Number(cn.exchangeRate);
    return {
      nroOperacion:        opNumber,
      fecha:               cn.issueDate,
      tipoDoc:             'NC',
      rifProveedor:        '',
      nombreProveedor:     '',
      nroFactura:          cn.noteNumber,
      nroControl:          cn.controlNumber ?? '',
      nroNotaCredito:      cn.noteNumber,
      nroNotaDebito:       '',
      nroPlanillaImport:   '',
      nroExpedienteAduana: '',
      totalConIva:         toVes(Number(cn.totalAmount), fx),
      sinDerechoCF:        0,
      baseExenta:          toVes(Number(cn.exemptAmount ?? 0), fx),
      base8:               toVes(Number(cn.taxableAmount8 ?? 0), fx),
      iva8:                toVes(Number(cn.taxAmount8 ?? 0), fx),
      base16:              toVes(Number(cn.taxableAmount16 ?? 0), fx),
      iva16:               toVes(Number(cn.taxAmount16 ?? 0), fx),
      nroCompRetIva:       '',
      montoRetIva:         0,
      nroCompRetIslr:      '',
      montoRetIslr:        0,
    };
  }

  private calcPurchaseTotals(rows: PurchaseBookRow[]) {
    return {
      totalConIva:  roundFiscal(rows.reduce((s, r) => s + r.totalConIva, 0)),
      sinDerechoCF: roundFiscal(rows.reduce((s, r) => s + r.sinDerechoCF, 0)),
      baseExenta:   roundFiscal(rows.reduce((s, r) => s + r.baseExenta, 0)),
      base8:        roundFiscal(rows.reduce((s, r) => s + r.base8, 0)),
      iva8:         roundFiscal(rows.reduce((s, r) => s + r.iva8, 0)),
      base16:       roundFiscal(rows.reduce((s, r) => s + r.base16, 0)),
      iva16:        roundFiscal(rows.reduce((s, r) => s + r.iva16, 0)),
      montoRetIva:  roundFiscal(rows.reduce((s, r) => s + r.montoRetIva, 0)),
      montoRetIslr: roundFiscal(rows.reduce((s, r) => s + r.montoRetIslr, 0)),
    };
  }

  // ══════════════════════════════════════════
  // CRUD: NOTAS DE CRÉDITO
  // ══════════════════════════════════════════
  async createCreditNote(dto: CreateCreditNoteDto) {
    const issueDate = new Date(dto.issueDate);
    const fiscalMonth = dto.fiscalMonth ?? issueDate.getMonth() + 1;
    const fiscalYear  = dto.fiscalYear  ?? issueDate.getFullYear();

    // Calcular nota correlativa
    const count = await this.prisma.creditNote.count({ where: { companyId: dto.companyId } });
    const noteNumber = `NC-${fiscalYear}-${String(count + 1).padStart(4, '0')}`;

    // Calcular sumatorias de retrocompatibilidad
    const taxableAmount = (dto.taxableAmount16 ?? 0) + (dto.taxableAmount8 ?? 0);
    const taxAmount     = (dto.taxAmount16 ?? 0) + (dto.taxAmount8 ?? 0);

    return this.prisma.creditNote.create({
      data: {
        companyId:              dto.companyId,
        clientId:               dto.clientId,
        supplierId:             dto.supplierId,
        noteNumber,
        controlNumber:          dto.controlNumber,
        issueDate,
        fiscalMonth,
        fiscalYear,
        affectedSalesInvoiceId: dto.affectedSalesInvoiceId,
        affectedPurchaseBillId: dto.affectedPurchaseBillId,
        isExtemporaneous:       dto.isExtemporaneous ?? false,
        affectedFiscalMonth:    dto.affectedFiscalMonth,
        affectedFiscalYear:     dto.affectedFiscalYear,
        currencyCode:           dto.currencyCode ?? 'USD',
        exchangeRate:           dto.exchangeRate,
        exemptAmount:           dto.exemptAmount ?? 0,
        taxableAmount16:        dto.taxableAmount16 ?? 0,
        taxAmount16:            dto.taxAmount16 ?? 0,
        taxableAmount8:         dto.taxableAmount8 ?? 0,
        taxAmount8:             dto.taxAmount8 ?? 0,
        taxableAmount,
        taxAmount,
        totalAmount:            dto.totalAmount,
        reason:                 dto.reason,
      },
    });
  }

  // ══════════════════════════════════════════
  // CRUD: NOTAS DE DÉBITO
  // ══════════════════════════════════════════
  async createDebitNote(dto: CreateDebitNoteDto) {
    const issueDate = new Date(dto.issueDate);
    const fiscalMonth = dto.fiscalMonth ?? issueDate.getMonth() + 1;
    const fiscalYear  = dto.fiscalYear  ?? issueDate.getFullYear();

    const count = await this.prisma.debitNote.count({ where: { companyId: dto.companyId } });
    const noteNumber = `ND-${fiscalYear}-${String(count + 1).padStart(4, '0')}`;

    const taxableAmount = (dto.taxableAmount16 ?? 0) + (dto.taxableAmount8 ?? 0);
    const taxAmount     = (dto.taxAmount16 ?? 0) + (dto.taxAmount8 ?? 0);

    return this.prisma.debitNote.create({
      data: {
        companyId:             dto.companyId,
        clientId:              dto.clientId,
        noteNumber,
        controlNumber:         dto.controlNumber,
        issueDate,
        fiscalMonth,
        fiscalYear,
        affectedSalesInvoiceId: dto.affectedSalesInvoiceId,
        currencyCode:          dto.currencyCode ?? 'USD',
        exchangeRate:          dto.exchangeRate,
        exemptAmount:          dto.exemptAmount ?? 0,
        taxableAmount16:       dto.taxableAmount16 ?? 0,
        taxAmount16:           dto.taxAmount16 ?? 0,
        taxableAmount8:        dto.taxableAmount8 ?? 0,
        taxAmount8:            dto.taxAmount8 ?? 0,
        taxableAmount,
        taxAmount,
        totalAmount:           dto.totalAmount,
        reason:                dto.reason,
      },
    });
  }

  // ══════════════════════════════════════════
  // CRUD: RETENCIONES IVA RECIBIDAS (Clientes)
  // ══════════════════════════════════════════
  async registerIvaRetentionReceived(dto: RegisterIvaRetentionReceivedDto) {
    // Verificar que la factura existe
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id: dto.salesInvoiceId },
    });
    if (!invoice) throw new NotFoundException('Factura de venta no encontrada');

    // Evitar duplicado por controlNumber
    const existing = await this.prisma.ivaRetentionReceived.findUnique({
      where: { controlNumber: dto.controlNumber },
    });
    if (existing) throw new BadRequestException(`Ya existe una retención con comprobante ${dto.controlNumber}`);

    const retDate = new Date(dto.retentionDate);

    return this.prisma.ivaRetentionReceived.create({
      data: {
        companyId:      dto.companyId,
        clientId:       dto.clientId,
        salesInvoiceId: dto.salesInvoiceId,
        controlNumber:  dto.controlNumber,
        retentionDate:  retDate,
        retentionMonth: retDate.getMonth() + 1,
        retentionYear:  retDate.getFullYear(),
        retainedAmount: dto.retainedAmount,
        taxableBase:    dto.taxableBase,
        percentage:     dto.percentage,
      },
    });
  }

  async findAllIvaRetentionsReceived(companyId: string, year?: number, month?: number) {
    return this.prisma.ivaRetentionReceived.findMany({
      where: {
        companyId,
        ...(year  ? { retentionYear: year  } : {}),
        ...(month ? { retentionMonth: month } : {}),
      },
      include: {
        salesInvoice: { select: { invoiceNumber: true, controlNumber: true } },
      },
      orderBy: { retentionDate: 'asc' },
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Tipos de filas de los libros (para tipado estricto)
// ─────────────────────────────────────────────────────────────
export interface SalesBookRow {
  nroOperacion:   number;
  fecha:          Date;
  tipoDoc:        string;
  rif:            string;
  razonSocial:    string;
  nroFactura:     string;
  nroControl:     string;
  nroNotaDebito:  string;
  nroNotaCredito: string;
  nroAfectada:    string;
  totalConIva:    number;
  baseExenta:     number;
  base8:          number;
  iva8:           number;
  base16:         number;
  iva16:          number;
  base31:         number;
  iva31:          number;
  igtf:           number;
  nroCompRet:     string;
  fechaRet:       Date | null;
  montoRet:       number;
}

export interface PurchaseBookRow {
  nroOperacion:        number;
  fecha:               Date;
  tipoDoc:             string;
  rifProveedor:        string;
  nombreProveedor:     string;
  nroFactura:          string;
  nroControl:          string;
  nroNotaCredito:      string;
  nroNotaDebito:       string;
  nroPlanillaImport:   string;
  nroExpedienteAduana: string;
  totalConIva:         number;
  sinDerechoCF:        number;
  baseExenta:          number;
  base8:               number;
  iva8:                number;
  base16:              number;
  iva16:               number;
  nroCompRetIva:       string;
  montoRetIva:         number;
  nroCompRetIslr:      string;
  montoRetIslr:        number;
}
