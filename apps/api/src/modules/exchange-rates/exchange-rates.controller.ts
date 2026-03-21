import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  // ─── Endpoints existentes (compatibilidad) ────────────────────────────────

  /** Obtiene la última tasa USD/VES */
  @Get('latest')
  async getLatest() {
    return this.service.getLatestRate();
  }

  /** Sincroniza la tasa USD/VES desde el BCV */
  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncRate() {
    return this.service.fetchAndSaveBCVRate();
  }

  // ─── Nuevos endpoints multi-moneda ───────────────────────────────────────

  /** Obtiene USD y EUR en una sola llamada — usado por el navbar */
  @Get('latest-all')
  async getLatestAll() {
    return this.service.getLatestAllRates();
  }

  /** Sincroniza la tasa EUR/VES desde el BCV */
  @Post('sync-eur')
  @UseGuards(JwtAuthGuard)
  async syncEURRate() {
    return this.service.fetchAndSaveEURRate();
  }

  /** Sincroniza ambas tasas (USD y EUR) en una sola llamada */
  @Post('sync-all')
  @UseGuards(JwtAuthGuard)
  async syncAllRates() {
    const [usd, eur] = await Promise.allSettled([
      this.service.fetchAndSaveBCVRate(),
      this.service.fetchAndSaveEURRate(),
    ]);
    return {
      usd: usd.status === 'fulfilled' ? usd.value : { error: (usd as PromiseRejectedResult).reason?.message },
      eur: eur.status === 'fulfilled' ? eur.value : { error: (eur as PromiseRejectedResult).reason?.message },
    };
  }
}
