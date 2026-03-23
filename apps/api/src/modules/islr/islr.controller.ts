import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { IslrService } from './islr.service';
import { CalculateIslrDto } from './dto/calculate-islr.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('islr')
export class IslrController {
  constructor(private readonly islrService: IslrService) {}

  @Post('calculate')
  @UseGuards(AuthGuard('jwt'))
  async calculateRetention(@Body() calculateIslrDto: CalculateIslrDto, @Request() req: Express.Request & { user?: { companyId: string } }) {
    if (!calculateIslrDto.companyId && (req.user as { companyId?: string })?.companyId) {
      calculateIslrDto.companyId = (req.user as { companyId: string }).companyId;
    }
    return this.islrService.calculateRetention(calculateIslrDto);
  }

  @Get('ut')
  @UseGuards(AuthGuard('jwt'))
  async getUt() {
    return this.islrService.getUtValue();
  }

  @Post('ut')
  @UseGuards(AuthGuard('jwt'))
  async updateUt(@Body() body: { value: number }) {
    return this.islrService.updateUtValue(body.value);
  }

  @Get('concepts')
  @UseGuards(AuthGuard('jwt'))
  async getConcepts() {
    return this.islrService.getConcepts();
  }

  @Post('seed')
  @UseGuards(AuthGuard('jwt'))
  async seedConcepts() {
    return this.islrService.seedMatrix();
  }

  // ── Endpoints públicos (acceso desde nueva pestaña sin sesión activa) ──

  @Get('by-receipt/:controlNumber')
  async getByReceipt(@Param('controlNumber') controlNumber: string) {
    return this.islrService.getByControlNumber(controlNumber);
  }

  @Get(':id/voucher')
  async getVoucher(@Param('id') id: string) {
    return this.islrService.getVoucherData(id);
  }
}
