import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DocumentFormatsService } from './document-formats.service';

@Controller('document-formats')
@UseGuards(AuthGuard('jwt'))
export class DocumentFormatsController {
  constructor(private readonly service: DocumentFormatsService) {}

  @Get(':type')
  async getFormat(@Param('type') type: string, @Request() req) {
    const companyId = req.user.companyId;
    return this.service.getFormat(companyId, type.toUpperCase());
  }

  @Post(':type')
  async updateFormat(@Param('type') type: string, @Body() data: any, @Request() req) {
    const companyId = req.user.companyId;
    return this.service.upsertFormat(companyId, type.toUpperCase(), data);
  }
}
