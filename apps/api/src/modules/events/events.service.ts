import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string | null) {
    const where = companyId ? { companyId } : {};
    return this.prisma.event.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        incomes: true,
        expenses: {
          include: { expenseItems: true }
        }
      }
    });
  }

  async create(companyId: string, data: { name: string; date: string; status?: string }) {
    if (!companyId) {
      throw new NotFoundException('No se puede crear un evento sin una empresa asignada. Asigne una empresa al usuario primero.');
    }
    return this.prisma.event.create({
      data: {
        companyId,
        name: data.name,
        date: new Date(data.date),
        status: data.status || 'ACTIVE'
      }
    });
  }

  async findById(id: string, companyId: string | null) {
    const where = companyId ? { id, companyId } : { id };
    const event = await this.prisma.event.findFirst({
      where,
      include: {
        incomes: {
          include: { income: { include: { eventDetails: true } } }
        },
        expenses: {
          include: {
            expenseItems: {
              include: { expenseCategory: true, department: true }
            }
          }
        }
      }
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }

  async getFinancialSummary(id: string, companyId: string | null) {
    const event = await this.findById(id, companyId);
    
    let totalIncome = 0;
    event.incomes.forEach(i => {
      totalIncome += Number(i.amountApplied);
    });

    let totalExpense = 0;
    event.expenses.forEach(e => {
      totalExpense += Number(e.amountPaid);
    });

    return {
      totalIncome,
      totalExpense,
      grossProfit: totalIncome - totalExpense
    };
  }

  async getMonthlyReport(companyId: string | null) {
    const where = companyId ? { companyId } : {};
    const events = await this.prisma.event.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        incomes: { include: { income: true } },
        expenses: {
          include: {
            expenseItems: { include: { expenseCategory: true } }
          }
        }
      }
    });

    const report = events.map(event => {
      let ingreso = 0;
      let lastIncomeDate: Date | null = null;
      
      event.incomes.forEach(i => {
        ingreso += Number(i.amountApplied);
        if (!lastIncomeDate || i.income.paymentDate > lastIncomeDate) {
          lastIncomeDate = i.income.paymentDate;
        }
      });

      let nomina = 0;
      let viaticos = 0;
      let otros = 0;

      event.expenses.forEach(expense => {
        expense.expenseItems.forEach(item => {
          // Robust check for classification based on Category Match
          const catName = item.expenseCategory?.name.toUpperCase() || '';
          if (catName.includes('NOMINA') || catName.includes('NÓMINA')) {
            nomina += Number(item.amount);
          } else if (catName.includes('VIATICO') || catName.includes('VIÁTICO')) {
            viaticos += Number(item.amount);
          } else {
            otros += Number(item.amount);
          }
        });
      });

      const totalEgresos = nomina + viaticos + otros;
      
      return {
        id: event.id,
        date: event.date,
        name: event.name,
        ingreso,
        lastIncomeDate,
        nomina,
        viaticos,
        otrosGastos: otros,
        totalEgresos,
        profit: ingreso - totalEgresos
      };
    });

    return report;
  }

  // ═══════════════════════════════════════════════════════════════
  // 📥 IMPORTACIÓN MASIVA DESDE EXCEL
  // ═══════════════════════════════════════════════════════════════

  /**
   * Genera la plantilla Excel (.xlsx) formateada para que el usuario la llene.
   * Columnas: FECHA DE EVENTO | EVENTOS | INGRESO | FECHA DE PAGO RECIBIDO
   */
  async generateTemplate(): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LMCU ERP';
    workbook.created = new Date();

    // ── Hoja de DATOS ──
    const sheet = workbook.addWorksheet('Eventos', {
      properties: { defaultColWidth: 20 },
    });

    // Definir columnas
    sheet.columns = [
      { header: 'FECHA DE EVENTO', key: 'fechaEvento', width: 22 },
      { header: 'EVENTOS', key: 'nombre', width: 55 },
      { header: 'INGRESO', key: 'ingreso', width: 18 },
      { header: 'FECHA DE PAGO RECIBIDO', key: 'fechaPago', width: 26 },
    ];

    // Estilos del header (Fila 1)
    const headerRow = sheet.getRow(1);
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A1F2C' },
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11,
        name: 'Arial',
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF8B5CF6' } },
      };
    });

    // Formato numérico para columna INGRESO
    sheet.getColumn('ingreso').numFmt = '$#,##0.00';

    // Formato fecha para columnas A y D
    sheet.getColumn('fechaEvento').numFmt = 'DD/MM/YYYY';
    sheet.getColumn('fechaPago').numFmt = 'DD/MM/YYYY';

    // Fila de ejemplo (fila 2)
    const exampleRow = sheet.addRow({
      fechaEvento: new Date(2026, 2, 29), // 29/03/2026
      nombre: 'INAUGURACIÓN CIUDAD MURAL II PARTE',
      ingreso: 895.00,
      fechaPago: new Date(2026, 2, 30),
    });
    exampleRow.eachCell((cell) => {
      cell.font = { color: { argb: 'FF9CA3AF' }, italic: true, size: 10 };
      cell.alignment = { vertical: 'middle' };
    });

    // Segunda fila de ejemplo
    const exampleRow2 = sheet.addRow({
      fechaEvento: new Date(2026, 2, 26),
      nombre: 'INICIO OPERATIVO SEMANA SANTA 2026',
      ingreso: 405.00,
      fechaPago: new Date(2026, 2, 28),
    });
    exampleRow2.eachCell((cell) => {
      cell.font = { color: { argb: 'FF9CA3AF' }, italic: true, size: 10 };
      cell.alignment = { vertical: 'middle' };
    });

    // ── Hoja de INSTRUCCIONES ──
    const instrSheet = workbook.addWorksheet('Instrucciones', {
      properties: { defaultColWidth: 60 },
    });

    instrSheet.getColumn(1).width = 70;

    const instrucciones = [
      '📋 INSTRUCCIONES PARA CARGA MASIVA DE EVENTOS',
      '',
      '1. Complete la hoja "Eventos" con sus datos reales.',
      '2. Borre las filas de ejemplo (filas 2 y 3) antes de importar.',
      '',
      '📌 COLUMNAS OBLIGATORIAS:',
      '   • FECHA DE EVENTO — Fecha del evento (Formato: DD/MM/YYYY)',
      '   • EVENTOS — Nombre descriptivo del proyecto / evento',
      '',
      '📌 COLUMNAS OPCIONALES:',
      '   • INGRESO — Monto cobrado por el evento, en USD',
      '   • FECHA DE PAGO RECIBIDO — Fecha en que se recibió el pago',
      '',
      '⚠️ NOTAS IMPORTANTES:',
      '   • Si no indica FECHA DE PAGO, se usará la fecha del evento',
      '   • Los montos deben ser numéricos (sin texto ni símbolos)',
      '   • Cada fila creará un evento independiente en el sistema',
      '   • El archivo debe ser formato .xlsx (Excel 2007+)',
    ];

    instrucciones.forEach((text, idx) => {
      const row = instrSheet.addRow([text]);
      if (idx === 0) {
        row.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF8B5CF6' } };
        row.height = 30;
      } else if (text.startsWith('📌') || text.startsWith('⚠️')) {
        row.getCell(1).font = { bold: true, size: 11 };
      }
    });

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Importa eventos desde un archivo Excel (.xlsx).
   * Crea Event + Income + IncomeEventDetail por cada fila válida.
   */
  async importFromExcel(
    companyId: string,
    fileBuffer: Buffer,
  ): Promise<{ created: number; skipped: number; errors: { row: number; message: string }[] }> {
    if (!companyId) {
      throw new BadRequestException(
        'No se puede importar sin una empresa asignada. Asigne una empresa al usuario primero.',
      );
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const sheet = workbook.getWorksheet('Eventos') || workbook.getWorksheet(1);
    if (!sheet) {
      throw new BadRequestException('No se encontró la hoja "Eventos" en el archivo.');
    }

    // Parsear filas (empezando desde la fila 2, la 1 es header)
    const rows: {
      row: number;
      date: Date;
      name: string;
      ingreso: number | null;
      fechaPago: Date | null;
    }[] = [];
    const errors: { row: number; message: string }[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rawDate = row.getCell(1).value;
      const rawName = row.getCell(2).value;
      const rawIngreso = row.getCell(3).value;
      const rawFechaPago = row.getCell(4).value;

      // ── Validación: Nombre obligatorio ──
      const name = this.extractCellText(rawName);
      if (!name || name.trim().length === 0) {
        errors.push({ row: rowNumber, message: 'Nombre del evento vacío' });
        return;
      }

      // ── Validación: Fecha obligatoria ──
      const date = this.parseDate(rawDate);
      if (!date) {
        errors.push({ row: rowNumber, message: `Fecha inválida: "${rawDate}"` });
        return;
      }

      // ── Opcional: Ingreso ──
      const ingreso = this.parseNumber(rawIngreso);

      // ── Opcional: Fecha de pago ──
      const fechaPago = this.parseDate(rawFechaPago);

      rows.push({
        row: rowNumber,
        date,
        name: name.trim(),
        ingreso,
        fechaPago,
      });
    });

    if (rows.length === 0 && errors.length === 0) {
      throw new BadRequestException('El archivo no contiene datos. Asegúrese de llenar la hoja "Eventos".');
    }

    // ── Ejecutar en transacción ──
    let created = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const item of rows) {
        try {
          // 1. Crear evento
          const event = await tx.event.create({
            data: {
              companyId,
              name: item.name,
              date: item.date,
              status: 'ACTIVE',
            },
          });

          // 2. Si hay ingreso, crear Income + IncomeEventDetail
          if (item.ingreso && item.ingreso > 0) {
            await tx.income.create({
              data: {
                companyId,
                amount: item.ingreso,
                currencyCode: 'USD',
                paymentDate: item.fechaPago || item.date,
                description: `Ingreso importado: ${item.name}`,
                eventDetails: {
                  create: {
                    eventId: event.id,
                    amountApplied: item.ingreso,
                  },
                },
              },
            });
          }

          created++;
        } catch (err: any) {
          errors.push({
            row: item.row,
            message: `Error al crear: ${err.message || 'Error desconocido'}`,
          });
        }
      }
    });

    return {
      created,
      skipped: rows.length - created,
      errors,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔧 UTILIDADES PRIVADAS PARA PARSEO DE EXCEL
  // ═══════════════════════════════════════════════════════════════

  private extractCellText(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object' && 'text' in value) return (value as any).text;
    if (typeof value === 'object' && 'result' in value) return String((value as any).result);
    return String(value);
  }

  private parseDate(value: ExcelJS.CellValue): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      // Intentar DD/MM/YYYY
      const ddmmyyyy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const d = new Date(Number(year), Number(month) - 1, Number(day));
        if (!isNaN(d.getTime())) return d;
      }
      // Intentar formato ISO o genérico
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    if (typeof value === 'number') {
      // No. de serie Excel (días desde 1900-01-01)
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + value * 86400000);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  private parseNumber(value: ExcelJS.CellValue): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Limpiar símbolos de moneda y separadores
      const cleaned = value.replace(/[$,\s]/g, '').replace(/\./g, '').replace(',', '.');
      const n = parseFloat(cleaned);
      if (!isNaN(n)) return n;
    }
    if (typeof value === 'object' && 'result' in value) {
      const result = (value as any).result;
      if (typeof result === 'number') return result;
    }
    return null;
  }
}
