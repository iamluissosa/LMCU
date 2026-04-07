import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { PaymentsOutService } from './payments-out.service';
import { AuthGuard } from '@nestjs/passport';
import { CreatePaymentOutDto } from './dto/create-payments-out.dto';
import { UpdatePaymentsOutDto } from './dto/update-payments-out.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('payments-out')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PaymentsOutController {
  constructor(private readonly paymentsOutService: PaymentsOutService) {}

  @Post()
  @Permissions('payments.create')
  create(@Request() req, @Body() data: CreatePaymentOutDto) {
    return this.paymentsOutService.create(
      req.user.companyId,
      req.user.id,
      data,
    );
  }

  @Get(':id')
  @Permissions('payments.view')
  findOne(@Request() req, @Param('id') id: string) {
    return this.paymentsOutService.findOne(req.user.companyId, id);
  }

  @Patch(':id')
  @Permissions('payments.edit')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() data: UpdatePaymentsOutDto,
  ) {
    return this.paymentsOutService.update(
      req.user.companyId,
      req.user.id,
      id,
      data,
    );
  }

  @Delete(':id')
  @Permissions('payments.delete')
  remove(@Request() req, @Param('id') id: string) {
    return this.paymentsOutService.remove(
      req.user.companyId,
      req.user.id,
      id,
    );
  }

  @Get()
  @Permissions('payments.view')
  findAll(
    @Request() req,
    @Query() pagination: PaginationDto = new PaginationDto(),
  ) {
    return this.paymentsOutService.findAll(
      req.user.companyId,
      pagination || new PaginationDto(),
    );
  }
}
