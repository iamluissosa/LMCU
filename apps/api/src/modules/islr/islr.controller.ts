import {
  Controller, Get, Post, Body, UseGuards, Request, Param,
  Res, UploadedFile, UseInterceptors, HttpCode, HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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

  // ── Exportar plantilla Excel (con datos actuales pre-cargados) ──────────

  @Get('export-template')
  @UseGuards(AuthGuard('jwt'))
  async exportTemplate(@Res() res: Response) {
    const buffer = await this.islrService.exportTemplate();
    const date = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="decreto1808_${date}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ── Importar matriz ISLR desde Excel ────────────────────────────────────

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importMatrix(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { success: false, message: 'No se recibió ningún archivo.', errors: [] };
    }
    const allowedMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (file.mimetype !== allowedMime && !file.originalname.endsWith('.xlsx')) {
      return { success: false, message: 'El archivo debe ser formato Excel (.xlsx).', errors: [] };
    }
    return this.islrService.importFromExcel(file.buffer);
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
