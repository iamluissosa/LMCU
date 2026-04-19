import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { CreateCommissionRuleDto } from './dto/commission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get('rules')
  getRules(@Request() req: any) {
    return this.commissionsService.getRules(req.user.companyId);
  }

  @Post('rules')
  createRule(@Request() req: any, @Body() dto: CreateCommissionRuleDto) {
    return this.commissionsService.createRule(req.user.companyId, dto);
  }

  @Patch('rules/:id/deactivate')
  deactivateRule(@Request() req: any, @Param('id') id: string) {
    return this.commissionsService.deactivateRule(req.user.companyId, id);
  }

  @Get('ledger')
  getLedger(
    @Request() req: any,
    @Query('salespersonId') salespersonId?: string,
    @Query('fiscalMonth') fiscalMonth?: number,
    @Query('fiscalYear') fiscalYear?: number,
  ) {
    return this.commissionsService.getLedger(req.user.companyId, {
      salespersonId,
      fiscalMonth,
      fiscalYear,
    });
  }

  @Get('summary/:salespersonId')
  getSummary(@Request() req: any, @Param('salespersonId') salespersonId: string) {
    return this.commissionsService.getSummary(req.user.companyId, salespersonId);
  }

  @Post('pay')
  payCommission(
    @Request() req: any,
    @Body() data: {
      salespersonId: string;
      amount: number;
      method: string;
      reference?: string;
      bankName?: string;
      currencyCode?: string;
      exchangeRate?: number;
      notes?: string;
      expenseCategoryId?: string;
    }
  ) {
    return this.commissionsService.payCommissions(req.user.companyId, req.user.userId, data);
  }
}

