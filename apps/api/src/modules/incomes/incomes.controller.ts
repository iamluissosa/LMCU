import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IncomesService } from './incomes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('incomes')
@UseGuards(JwtAuthGuard)
export class IncomesController {
  constructor(private readonly service: IncomesService) {}

  @Post()
  create(
    @Request() req: any,
    @Body()
    body: {
      amount: number;
      currencyCode?: string;
      paymentDate?: string;
      clientName?: string;
      description?: string;
      eventDetails: { eventId: string; amountApplied: number }[];
    },
  ) {
    return this.service.create(req.user, body);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      amount?: number;
      currencyCode?: string;
      paymentDate?: string;
      clientName?: string;
      description?: string;
      eventDetails?: { eventId: string; amountApplied: number }[];
    },
  ) {
    return this.service.update(id, body, req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user.companyId);
  }
}
