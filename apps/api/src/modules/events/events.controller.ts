import { Controller, Get, Post, Param, Body, Request, UseGuards } from '@nestjs/common';
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

  @Get(':id/financial-summary')
  getFinancialSummary(@Param('id') id: string, @Request() req: any) {
    return this.service.getFinancialSummary(id, req.user.companyId);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Request() req: any) {
    return this.service.findById(id, req.user.companyId);
  }
}
