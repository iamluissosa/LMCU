import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('products')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Permissions('inventory.create')
  create(@Body() createProductDto: any, @Request() req) {
    const companyId =
      req.user.companyId ||
      (req.user.role === 'ADMIN' ? createProductDto.companyId : null);
    if (!companyId)
      throw new Error('Se requiere ID de empresa para crear un producto');
    return this.productsService.create(createProductDto, companyId);
  }

  @Get()
  @Permissions('inventory.view')
  findAll(@Request() req) {
    const user = req.user;
    return this.productsService.findAll(user.companyId, user.role);
  }

  @Get(':id')
  @Permissions('inventory.view')
  findOne(@Param('id') id: string, @Request() req) {
    const companyId = req.user.companyId;
    return this.productsService.findOne(id, companyId);
  }

  @Patch(':id')
  @Permissions('inventory.edit')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: any,
    @Request() req,
  ) {
    const companyId = req.user.companyId;
    return this.productsService.update(id, updateProductDto, companyId);
  }

  @Delete(':id')
  @Permissions('inventory.delete')
  remove(@Param('id') id: string, @Request() req) {
    const companyId = req.user.companyId;
    return this.productsService.remove(id, companyId);
  }
}
