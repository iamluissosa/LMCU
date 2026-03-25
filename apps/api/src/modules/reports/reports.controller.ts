import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('expenses')
  async getExpenseHistory(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.reportsService.getUnifiedExpenses({
      startDate,
      endDate,
      categoryId,
      departmentId,
    });
  }
}
