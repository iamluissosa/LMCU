import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.companyId);
  }

  @Post()
  create(@Request() req: any, @Body() body: { name: string; date: string; status?: string }) {
    return this.service.create(req.user.companyId, body);
  }

  @Get('report/monthly')
  getMonthlyReport(@Request() req: any) {
    return this.service.getMonthlyReport(req.user.companyId);
  }

  // ── IMPORTACIÓN MASIVA ──────────────────────────────

  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.service.generateTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=plantilla_eventos.xlsx',
      'Cache-Control': 'no-cache',
    });
    res.send(Buffer.from(buffer));
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        const validMimes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ];
        if (validMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos Excel (.xlsx)'), false);
        }
      },
    }),
  )
  async importExcel(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }
    return this.service.importFromExcel(req.user.companyId, file.buffer);
  }

  // ─────────────────────────────────────────────────────

  @Get(':id/financial-summary')
  getFinancialSummary(@Param('id') id: string, @Request() req: any) {
    return this.service.getFinancialSummary(id, req.user.companyId);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Request() req: any) {
    return this.service.findById(id, req.user.companyId);
  }
}
