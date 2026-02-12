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

@Controller('products')
@UseGuards(AuthGuard('jwt')) 
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: any, @Request() req) {
    const companyId = req.user.companyId || (req.user.role === 'ADMIN' ? createProductDto.companyId : null);
    if (!companyId) throw new Error('Se requiere ID de empresa para crear un producto');
    return this.productsService.create(createProductDto, companyId);
  }

  @Get()
  findAll(@Request() req) {
    const user = req.user;
    return this.productsService.findAll(user.companyId, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const companyId = req.user.companyId;
    return this.productsService.findOne(id, companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: any, @Request() req) {
    const companyId = req.user.companyId;
    return this.productsService.update(id, updateProductDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const companyId = req.user.companyId;
    return this.productsService.remove(id, companyId);
  }
}
