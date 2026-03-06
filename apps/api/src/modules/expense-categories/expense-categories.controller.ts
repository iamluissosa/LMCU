import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ExpenseCategoriesService } from './expense-categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('expense-categories')
@UseGuards(JwtAuthGuard)
export class ExpenseCategoriesController {
  constructor(private readonly service: ExpenseCategoriesService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.companyId);
  }

  @Post()
  create(
    @Request() req: any,
    @Body() body: { name: string; description?: string },
  ) {
    return this.service.create(req.user.companyId, body);
  }
}
