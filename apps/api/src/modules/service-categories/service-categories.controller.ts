import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ServiceCategoriesService } from './service-categories.service';
import {
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
} from './dto/service-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('service-categories')
@UseGuards(JwtAuthGuard)
export class ServiceCategoriesController {
  constructor(
    private readonly serviceCategoriesService: ServiceCategoriesService,
  ) {}

  @Post()
  create(@Req() req, @Body() dto: CreateServiceCategoryDto) {
    return this.serviceCategoriesService.create(req.user.companyId, dto);
  }

  @Get()
  findAll(@Req() req) {
    return this.serviceCategoriesService.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.serviceCategoriesService.findOne(req.user.companyId, id);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateServiceCategoryDto,
  ) {
    return this.serviceCategoriesService.update(req.user.companyId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.serviceCategoriesService.remove(req.user.companyId, id);
  }
}
