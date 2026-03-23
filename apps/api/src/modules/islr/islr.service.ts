import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CalculateIslrDto } from './dto/calculate-islr.dto';

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
}
