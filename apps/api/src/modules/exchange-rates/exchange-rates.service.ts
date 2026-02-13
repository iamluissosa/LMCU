
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(private prisma: PrismaService) {}

  async fetchAndSaveBCVRate() {
    try {
      this.logger.log('Fetching BCV rate from ve.dolarapi.com...');
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch rates: ${response.statusText}`);
      }

      const data = await response.json();
      
      // La API retorna un objeto con el campo "promedio" que es la tasa
      // Ejemplo: { fecha: "...", promedio: 36.1234, ... }
      
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
          date: new Date(), // Fecha actual de registro
        },
      });

      this.logger.log(`Tasa BCV guardada exitosamente: ${rate} VES/USD`);
      return newRate;

    } catch (error) {
        this.logger.error('Error fetching/saving BCV rate', error);
        throw error;
    }
  }

  async getLatestRate() {
    const rate = await this.prisma.exchangeRate.findFirst({
        orderBy: { date: 'desc' },
        where: { fromCurrency: 'USD', toCurrency: 'VES' }
    });
    return rate || {};
  }
}
