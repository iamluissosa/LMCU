
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  @Get('latest')
  async getLatest() {
    return this.service.getLatestRate();
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncRate() {
    return this.service.fetchAndSaveBCVRate();
  }
}
