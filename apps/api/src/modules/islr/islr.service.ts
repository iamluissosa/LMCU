import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CalculateIslrDto } from './dto/calculate-islr.dto';
import { ImportIslrResult, ImportRowError } from './dto/import-islr.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class IslrService {
  constructor(private prisma: PrismaService) {}

  /**
   * Ejecuta el algoritmo riguroso de retención ISLR en base al decreto 1808.
   */
  async calculateRetention(dto: CalculateIslrDto) {
    const { taxableBase, conceptId, supplierId } = dto;

    // 1. Obtener datos del proveedor (Incluyendo Tipo Persona y validación RIF Regex)
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    if (!supplier.personType) {
      throw new BadRequestException('El proveedor no tiene un Tipo de Persona Fiscal asignado (PNR, PJD...). Actualice su perfil primero.');
    }
    
    // Validar Regex RIF estricto
    const rifRegex = /^[VEJG]-?\d{8}-?\d$/;
    if (!supplier.rif || !rifRegex.test(supplier.rif)) {
      throw new BadRequestException('El RIF del proveedor no tiene formato válido (ej. J-12345678-9).');
    }

    // 2. Obtener la tasa (Cruce concepto / tipo_persona)
    const rate = await this.prisma.islrRate.findUnique({
      where: { 
        conceptId_personType: { 
          conceptId, 
          personType: supplier.personType 
        } 
      }
    });

    if (!rate) {
      throw new NotFoundException(`Tasa ISLR no configurada para el concepto seleccionado y el Tipo de Persona (${supplier.personType}).`);
    }

    // 3. Obtener el valor de la UT actual (Maestro Global)
    const utParam = await this.prisma.fiscalParameter.findUnique({ 
      where: { name: 'UNIDAD_TRIBUTARIA' } 
    });
    const utValue = utParam ? Number(utParam.value) : 0;

    // 4. ALGORITMO: Validar Mínimo Tributable
    const minTaxableAmount = Number(rate.minBaseUt) * utValue;
    if (taxableBase <= minTaxableAmount && minTaxableAmount > 0) {
      return this.buildZeroRetention(taxableBase);
    }

    // 5. ALGORITMO: Calcular Sustraendo Matemático (S = V_ut * F_s)
    const sustraendo = utValue * Number(rate.sustraendoFact);

    // 6. ALGORITMO: Calcular Retención Impositiva (R = (B * p) - S)
    // El porcentaje llega como 2 (que es 2%) o 5.
    const percentageCalc = Number(rate.percentage) / 100;
    
    let retainedAmount = (taxableBase * percentageCalc) - sustraendo;
    retainedAmount = Math.max(0, retainedAmount); // Evitar retención negativa

    return {
      taxableBase,
      percentage: Number(rate.percentage),
      sustraendo,
      retainedAmount
    };
  }

  private buildZeroRetention(taxableBase: number) {
    return {
      taxableBase,
      percentage: 0,
      sustraendo: 0,
      retainedAmount: 0,
      message: 'Base imponible por debajo del mínimo tributable. Retención 0.'
    };
  }

  // =====================================
  // ADMINISTRACIÓN MAESTRA (CRU)
  // =====================================

  async getUtValue() {
    const ut = await this.prisma.fiscalParameter.findUnique({ where: { name: 'UNIDAD_TRIBUTARIA' } });
    return ut || { name: 'UNIDAD_TRIBUTARIA', value: 0 };
  }

  async updateUtValue(value: number) {
    return this.prisma.fiscalParameter.upsert({
      where: { name: 'UNIDAD_TRIBUTARIA' },
      update: { value, effectiveDate: new Date() },
      create: { name: 'UNIDAD_TRIBUTARIA', value, effectiveDate: new Date() }
    });
  }

  async getConcepts() {
    return this.prisma.islrConcept.findMany({
      include: { rates: true },
      orderBy: { code: 'asc' }
    });
  }

  async seedMatrix() {
    // Decreto 1808: Cada concepto tiene DOS tasas (una por PJD y otra por PNR)
    // El código principal es el de la Persona Jurídica (J), agrupamos ambas tasas bajo el mismo concepto.
    const conceptMatrix = [
      {
        code: '058', description: 'Honorarios Profesionales',
        rates: [
          { personType: 'PJD', percentage: 5, sustraendoFact: 0, minBaseUt: 0 },
          { personType: 'PNR', percentage: 3, sustraendoFact: 107.50, minBaseUt: 0 },
        ]
      },
      {
        code: '054', description: 'Servicios (Ejecución de Obras/Servicios)',
        rates: [
          { personType: 'PJD', percentage: 2, sustraendoFact: 0, minBaseUt: 0 },
          { personType: 'PNR', percentage: 1, sustraendoFact: 35.83, minBaseUt: 0 },
        ]
      },
      {
        code: '052', description: 'Comisiones Mercantiles',
        rates: [
          { personType: 'PJD', percentage: 5, sustraendoFact: 0, minBaseUt: 0 },
          { personType: 'PNR', percentage: 3, sustraendoFact: 107.50, minBaseUt: 0 },
        ]
      },
      {
        code: '062', description: 'Arrendamiento de Inmuebles',
        rates: [
          { personType: 'PJD', percentage: 5, sustraendoFact: 0, minBaseUt: 0 },
          { personType: 'PNR', percentage: 3, sustraendoFact: 107.50, minBaseUt: 0 },
        ]
      },
    ];

    let conceptCount = 0;
    let rateCount = 0;

    for (const item of conceptMatrix) {
      // Upsert del concepto (crea o actualiza)
      const concept = await this.prisma.islrConcept.upsert({
        where: { code: item.code },
        update: { description: item.description },
        create: { code: item.code, description: item.description }
      });
      conceptCount++;

      // Crear/actualizar cada tasa bajo este concepto
      for (const rate of item.rates) {
        await this.prisma.islrRate.deleteMany({
          where: { conceptId: concept.id, personType: rate.personType as any }
        });

        await this.prisma.islrRate.create({
          data: {
            conceptId: concept.id,
            personType: rate.personType as any,
            percentage: rate.percentage,
            sustraendoFact: rate.sustraendoFact,
            minBaseUt: rate.minBaseUt,
          }
        });
        rateCount++;
      }
    }

    // Limpiar conceptos antiguos con códigos separados (059, 055, 053, 063) si existen
    const legacyCodes = ['059', '055', '053', '063'];
    for (const code of legacyCodes) {
      const old = await this.prisma.islrConcept.findUnique({ where: { code } });
      if (old) {
        // Mover las categorías de gasto vinculadas al concepto correcto
        const newCode = code === '059' ? '058' : code === '055' ? '054' : code === '053' ? '052' : '062';
        const newConcept = await this.prisma.islrConcept.findUnique({ where: { code: newCode } });
        if (newConcept) {
          await this.prisma.expenseCategory.updateMany({
            where: { islrConceptId: old.id },
            data: { islrConceptId: newConcept.id },
          });
        }
        // Eliminar tasas y luego el concepto legacy
        await this.prisma.islrRate.deleteMany({ where: { conceptId: old.id } });
        // Solo eliminar si no tiene retenciones asociadas
        const retentions = await this.prisma.islrRetention.count({ where: { conceptId: old.id } });
        if (retentions === 0) {
          await this.prisma.islrConcept.delete({ where: { id: old.id } });
        }
      }
    }

    return {
      success: true,
      concepts: conceptCount,
      rates: rateCount,
      message: `Matriz ISLR actualizada: ${conceptCount} conceptos con ${rateCount} tasas configuradas. Conceptos legacy migrados.`
    };
  }

  async getVoucherData(id: string) {
    const retention = await this.prisma.islrRetention.findUnique({
      where: { id },
      include: {
        company: { include: { settings: true } },
        supplier: true,
        concept: true,
      }
    });

    if (!retention) throw new NotFoundException('Comprobante de ISLR no encontrado');

    return retention;
  }

  async getByControlNumber(controlNumber: string) {
    const retention = await this.prisma.islrRetention.findUnique({
      where: { controlNumber },
      select: { id: true },
    });

    if (!retention) throw new NotFoundException('Retención ISLR no encontrada con ese número de comprobante');

    return retention;
  }

  // =====================================
  // IMPORTACIÓN / EXPORTACIÓN EXCEL
  // =====================================

  /**
   * Genera un archivo Excel (.xlsx) con los datos actuales de la BD como plantilla.
   * Si no hay datos, genera la plantilla vacía con la estructura correcta.
   */
  async exportTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LMCU ERP';
    workbook.created = new Date();

    // ── Hoja 1: Conceptos ──────────────────────────────────────────────────
    const wsConceptos = workbook.addWorksheet('Conceptos', {
      properties: { tabColor: { argb: 'FF2563EB' } },
    });

    wsConceptos.columns = [
      { header: 'Código (*)', key: 'code', width: 14 },
      { header: 'Descripción (*)', key: 'description', width: 45 },
      { header: 'Activo (*) [SI/NO]', key: 'isActive', width: 20 },
    ];

    // Estilo de cabecera
    wsConceptos.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF1D4ED8' } },
      };
    });

    // Cargar datos actuales de BD
    const conceptsFromDb = await this.prisma.islrConcept.findMany({
      orderBy: { code: 'asc' },
    });

    conceptsFromDb.forEach((c) => {
      wsConceptos.addRow({
        code: c.code,
        description: c.description,
        isActive: c.isActive ? 'SI' : 'NO',
      });
    });

    // ── Hoja 2: Tasas ──────────────────────────────────────────────────────
    const wsTasas = workbook.addWorksheet('Tasas', {
      properties: { tabColor: { argb: 'FF16A34A' } },
    });

    wsTasas.columns = [
      { header: 'Código Concepto (*)', key: 'conceptCode', width: 22 },
      { header: 'Tipo Persona (*) [PNR/PNNR/PJD/PJND]', key: 'personType', width: 38 },
      { header: 'Porcentaje % (*)', key: 'percentage', width: 18 },
      { header: 'Factor Sustraendo UT (*)', key: 'sustraendoFact', width: 26 },
      { header: 'Base Mínima UT (*)', key: 'minBaseUt', width: 20 },
    ];

    wsTasas.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF15803D' } },
      };
    });

    // Cargar tasas actuales de BD
    const ratesFromDb = await this.prisma.islrRate.findMany({
      include: { concept: true },
      orderBy: [{ concept: { code: 'asc' } }, { personType: 'asc' }],
    });

    ratesFromDb.forEach((r) => {
      wsTasas.addRow({
        conceptCode: r.concept.code,
        personType: r.personType,
        percentage: Number(r.percentage),
        sustraendoFact: Number(r.sustraendoFact),
        minBaseUt: Number(r.minBaseUt),
      });
    });

    // Validación desplegable para Tipo Persona (columna B) en Hoja Tasas
    for (let i = 2; i <= 200; i++) {
      wsTasas.getCell(`B${i}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"PNR,PNNR,PJD,PJND"'],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Valor inválido',
        error: 'Selecciona: PNR, PNNR, PJD o PJND',
      };
    }

    // Validación desplegable para Activo (columna C) en Hoja Conceptos
    for (let i = 2; i <= 200; i++) {
      wsConceptos.getCell(`C${i}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"SI,NO"'],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Valor inválido',
        error: 'Escribe SI o NO',
      };
    }

    // ── Hoja 3: Instrucciones ─────────────────────────────────────────────
    const wsInstr = workbook.addWorksheet('Instrucciones', {
      properties: { tabColor: { argb: 'FFEA580C' } },
    });

    const instrData = [
      ['PLANTILLA — DECRETO 1808 (ISLR)'],
      [''],
      ['INSTRUCCIONES DE USO:'],
      ['1. Complete la hoja "Conceptos" con los conceptos del Decreto 1808.'],
      ['2. Complete la hoja "Tasas" referenciando el Código Concepto de la hoja anterior.'],
      ['3. Los campos marcados con (*) son obligatorios.'],
      ['4. El campo "Tipo Persona" debe ser exactamente: PNR, PNNR, PJD o PJND.'],
      ['5. El campo "Porcentaje %" debe ser un número entre 0 y 100 (ej: 5 para 5%).'],
      ['6. El "Factor Sustraendo" y "Base Mínima" son en unidades de UT (puede ser 0).'],
      ['7. La importación reemplaza los datos existentes de forma ATÓMICA.'],
      ['   Si hay algún error, NO se realizará ningún cambio en la base de datos.'],
      [''],
      ['TIPOS DE PERSONA FISCAL:'],
      ['PNR  — Persona Natural Residente'],
      ['PNNR — Persona Natural No Residente'],
      ['PJD  — Persona Jurídica Domiciliada'],
      ['PJND — Persona Jurídica No Domiciliada'],
    ];

    instrData.forEach((rowData) => {
      wsInstr.addRow(rowData);
    });

    wsInstr.getColumn(1).width = 80;
    wsInstr.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFEA580C' } };
    wsInstr.getCell('A3').font = { bold: true, size: 12 };
    wsInstr.getCell('A13').font = { bold: true, size: 12 };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer as ArrayBuffer);
  }

  /**
   * Importa la matriz ISLR desde un archivo Excel.
   * Valida TODAS las filas antes de hacer cualquier cambio (transacción atómica).
   */
  async importFromExcel(fileBuffer: Buffer): Promise<ImportIslrResult> {
    const VALID_PERSON_TYPES = ['PNR', 'PNNR', 'PJD', 'PJND'] as const;
    const errors: ImportRowError[] = [];

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    // ── Leer Hoja Conceptos ────────────────────────────────────────────────
    const wsConceptos = workbook.getWorksheet('Conceptos');
    if (!wsConceptos) {
      throw new BadRequestException('El archivo no contiene la hoja "Conceptos". Descarga la plantilla oficial.');
    }

    const wsTasas = workbook.getWorksheet('Tasas');
    if (!wsTasas) {
      throw new BadRequestException('El archivo no contiene la hoja "Tasas". Descarga la plantilla oficial.');
    }

    // ── Parsear Conceptos (desde fila 2) ──────────────────────────────────
    interface ParsedConcept { code: string; description: string; isActive: boolean; }
    const parsedConcepts: ParsedConcept[] = [];
    const conceptCodes = new Set<string>();

    wsConceptos.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const rawCode = row.getCell(1).text?.toString().trim();
      const rawDesc = row.getCell(2).text?.toString().trim();
      const rawActive = row.getCell(3).text?.toString().trim().toUpperCase();

      if (!rawCode && !rawDesc) return; // fila vacía → ignorar

      if (!rawCode) {
        errors.push({ sheet: 'Conceptos', row: rowNumber, field: 'Código', message: 'El campo Código es obligatorio.' });
      } else if (conceptCodes.has(rawCode)) {
        errors.push({ sheet: 'Conceptos', row: rowNumber, field: 'Código', message: `El código "${rawCode}" está duplicado en la hoja.` });
      } else {
        conceptCodes.add(rawCode);
      }

      if (!rawDesc) {
        errors.push({ sheet: 'Conceptos', row: rowNumber, field: 'Descripción', message: 'La descripción es obligatoria.' });
      }

      if (rawActive !== 'SI' && rawActive !== 'NO') {
        errors.push({ sheet: 'Conceptos', row: rowNumber, field: 'Activo', message: 'El campo Activo debe ser exactamente "SI" o "NO".' });
      }

      if (rawCode && rawDesc && (rawActive === 'SI' || rawActive === 'NO')) {
        parsedConcepts.push({ code: rawCode, description: rawDesc, isActive: rawActive === 'SI' });
      }
    });

    if (parsedConcepts.length === 0 && errors.length === 0) {
      throw new BadRequestException('La hoja "Conceptos" no contiene filas de datos.');
    }

    // ── Parsear Tasas (desde fila 2) ──────────────────────────────────────
    interface ParsedRate {
      conceptCode: string;
      personType: 'PNR' | 'PNNR' | 'PJD' | 'PJND';
      percentage: number;
      sustraendoFact: number;
      minBaseUt: number;
    }
    const parsedRates: ParsedRate[] = [];
    const rateKeys = new Set<string>();

    wsTasas.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rawCode = row.getCell(1).text?.toString().trim();
      const rawPT   = row.getCell(2).text?.toString().trim().toUpperCase();
      const rawPct  = row.getCell(3).text?.toString().trim();
      const rawSust = row.getCell(4).text?.toString().trim();
      const rawMin  = row.getCell(5).text?.toString().trim();

      if (!rawCode && !rawPT && !rawPct) return; // fila vacía

      let hasRowError = false;

      if (!rawCode) {
        errors.push({ sheet: 'Tasas', row: rowNumber, field: 'Código Concepto', message: 'El campo es obligatorio.' });
        hasRowError = true;
      } else if (!conceptCodes.has(rawCode)) {
        errors.push({ sheet: 'Tasas', row: rowNumber, field: 'Código Concepto', message: `El código "${rawCode}" no existe en la hoja Conceptos.` });
        hasRowError = true;
      }

      if (!rawPT || !VALID_PERSON_TYPES.includes(rawPT as any)) {
        errors.push({ sheet: 'Tasas', row: rowNumber, field: 'Tipo Persona', message: `Valor inválido "${rawPT}". Debe ser: PNR, PNNR, PJD o PJND.` });
        hasRowError = true;
      }

      const pct = parseFloat(rawPct);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        errors.push({ sheet: 'Tasas', row: rowNumber, field: 'Porcentaje', message: `"${rawPct}" no es un número válido entre 0 y 100.` });
        hasRowError = true;
      }

      const sust = parseFloat(rawSust || '0');
      if (isNaN(sust) || sust < 0) {
        errors.push({ sheet: 'Tasas', row: rowNumber, field: 'Factor Sustraendo', message: `"${rawSust}" no es un número decimal válido ≥ 0.` });
        hasRowError = true;
      }

      const min = parseFloat(rawMin || '0');
      if (isNaN(min) || min < 0) {
        errors.push({ sheet: 'Tasas', row: rowNumber, field: 'Base Mínima UT', message: `"${rawMin}" no es un número decimal válido ≥ 0.` });
        hasRowError = true;
      }

      if (!hasRowError) {
        const key = `${rawCode}::${rawPT}`;
        if (rateKeys.has(key)) {
          errors.push({ sheet: 'Tasas', row: rowNumber, field: 'Tipo Persona', message: `Combinación duplicada: Concepto "${rawCode}" + Tipo "${rawPT}" ya existe en la hoja.` });
        } else {
          rateKeys.add(key);
          parsedRates.push({
            conceptCode: rawCode,
            personType: rawPT as any,
            percentage: pct,
            sustraendoFact: sust,
            minBaseUt: min,
          });
        }
      }
    });

    // ── Si hay errores → retornar sin tocar la BD ─────────────────────────
    if (errors.length > 0) {
      return {
        success: false,
        conceptsProcessed: 0,
        ratesProcessed: 0,
        errors,
        message: `Se encontraron ${errors.length} error(es). No se realizaron cambios en la base de datos.`,
      };
    }

    // ── Transacción atómica: Upsert de conceptos y tasas ─────────────────
    let conceptsProcessed = 0;
    let ratesProcessed = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const c of parsedConcepts) {
        await tx.islrConcept.upsert({
          where: { code: c.code },
          update: { description: c.description, isActive: c.isActive },
          create: { code: c.code, description: c.description, isActive: c.isActive },
        });
        conceptsProcessed++;
      }

      for (const r of parsedRates) {
        const concept = await tx.islrConcept.findUnique({ where: { code: r.conceptCode } });
        if (!concept) continue;

        await tx.islrRate.upsert({
          where: { conceptId_personType: { conceptId: concept.id, personType: r.personType } },
          update: {
            percentage: r.percentage,
            sustraendoFact: r.sustraendoFact,
            minBaseUt: r.minBaseUt,
          },
          create: {
            conceptId: concept.id,
            personType: r.personType,
            percentage: r.percentage,
            sustraendoFact: r.sustraendoFact,
            minBaseUt: r.minBaseUt,
          },
        });
        ratesProcessed++;
      }
    });

    return {
      success: true,
      conceptsProcessed,
      ratesProcessed,
      errors: [],
      message: `Importación exitosa: ${conceptsProcessed} concepto(s) y ${ratesProcessed} tasa(s) actualizadas.`,
    };
  }
}
