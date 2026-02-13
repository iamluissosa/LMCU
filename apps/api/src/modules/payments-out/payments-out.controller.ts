import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentsOutService } from './payments-out.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('payments-out')
@UseGuards(AuthGuard('jwt'))
export class PaymentsOutController {
  constructor(private readonly paymentsOutService: PaymentsOutService) {}

  @Post()
  create(@Request() req, @Body() data: any) {
    return this.paymentsOutService.create(req.user.companyId, data);
  }

  @Get()
  findAll(@Request() req) {
    return this.paymentsOutService.findAll(req.user.companyId);
  }
}