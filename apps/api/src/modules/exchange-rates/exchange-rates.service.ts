import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(private prisma: PrismaService) {}

  // ─── USD / VES ─────────────────────────────────────────────────────────────

  async fetchAndSaveBCVRate() {
    try {
      this.logger.log('Fetching BCV USD rate from ve.dolarapi.com...');
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');

      if (!response.ok) {
        throw new Error(`Failed to fetch USD rate: ${response.statusText}`);
      }

      const data = await response.json();
      const rate = data.promedio;

      if (!rate) {
        throw new Error('Formato de API inesperado: No se encontró el campo promedio');
      }

      const newRate = await this.prisma.exchangeRate.create({
        data: {
          fromCurrency: 'USD',
          toCurrency: 'VES',
          rate: rate,
          source: 'BCV (ve.dolarapi.com)',
          date: new Date(),
        },
      });

      this.logger.log(`Tasa BCV USD guardada exitosamente: ${rate} VES/USD`);
      return newRate;
    } catch (error) {
      this.logger.error('Error fetching/saving BCV USD rate', error);
      throw error;
    }
  }

  async getLatestRate() {
    const rate = await this.prisma.exchangeRate.findFirst({
      orderBy: { date: 'desc' },
      where: { fromCurrency: 'USD', toCurrency: 'VES' },
    });
    return rate || {};
  }

  // ─── EUR / VES ─────────────────────────────────────────────────────────────

  async fetchAndSaveEURRate() {
    try {
      this.logger.log('Fetching BCV EUR rate from ve.dolarapi.com...');
      // La API retorna un ARRAY: [{ fuente:'oficial', promedio: X }, { fuente:'paralelo', promedio: Y }]
      const response = await fetch('https://ve.dolarapi.com/v1/euros');

      if (!response.ok) {
        throw new Error(`Failed to fetch EUR rate: ${response.statusText}`);
      }

      const data: Array<{ fuente: string; promedio: number | null }> = await response.json();

      // Tomar solo la fuente oficial del BCV
      const oficial = data.find((item) => item.fuente === 'oficial');
      const rate = oficial?.promedio;

      if (!rate) {
        throw new Error('No se encontró la tasa oficial del EUR en la respuesta de ve.dolarapi.com/v1/euros');
      }

      const newRate = await this.prisma.exchangeRate.create({
        data: {
          fromCurrency: 'EUR',
          toCurrency: 'VES',
          rate: rate,
          source: 'BCV (ve.dolarapi.com/v1/euros — oficial)',
          date: new Date(),
        },
      });

      this.logger.log(`Tasa BCV EUR guardada exitosamente: ${rate} VES/EUR`);
      return newRate;
    } catch (error) {
      this.logger.error('Error fetching/saving BCV EUR rate', error);
      throw error;
    }
  }

  async getLatestEURRate() {
    const rate = await this.prisma.exchangeRate.findFirst({
      orderBy: { date: 'desc' },
      where: { fromCurrency: 'EUR', toCurrency: 'VES' },
    });
    return rate || {};
  }

  // ─── TODAS LAS TASAS (un solo endpoint para el frontend) ───────────────────

  async getLatestAllRates(): Promise<{
    usd: { rate: number | null; date: Date | null; source: string | null };
    eur: { rate: number | null; date: Date | null; source: string | null };
  }> {
    const [usd, eur] = await Promise.all([
      this.prisma.exchangeRate.findFirst({
        orderBy: { date: 'desc' },
        where: { fromCurrency: 'USD', toCurrency: 'VES' },
        select: { rate: true, date: true, source: true },
      }),
      this.prisma.exchangeRate.findFirst({
        orderBy: { date: 'desc' },
        where: { fromCurrency: 'EUR', toCurrency: 'VES' },
        select: { rate: true, date: true, source: true },
      }),
    ]);

    return {
      usd: {
        rate: usd ? Number(usd.rate) : null,
        date: usd?.date ?? null,
        source: usd?.source ?? null,
      },
      eur: {
        rate: eur ? Number(eur.rate) : null,
        date: eur?.date ?? null,
        source: eur?.source ?? null,
      },
    };
  }
}
