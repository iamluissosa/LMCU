import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { PaymentsOutService } from './payments-out.service';
import { AuthGuard } from '@nestjs/passport';
import { CreatePaymentOutDto } from './dto/create-payments-out.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('payments-out')
@UseGuards(AuthGuard('jwt'))
export class PaymentsOutController {
  constructor(private readonly paymentsOutService: PaymentsOutService) {}

  @Post()
  create(@Request() req, @Body() data: CreatePaymentOutDto) {
    return this.paymentsOutService.create(req.user.companyId, req.user.id, data);
  }



// ... class

  @Get()
  findAll(@Request() req, @Query() pagination: PaginationDto = new PaginationDto()) {
    return this.paymentsOutService.findAll(req.user.companyId, pagination || new PaginationDto());
  }
}