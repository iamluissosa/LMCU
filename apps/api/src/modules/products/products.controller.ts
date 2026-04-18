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
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

@Controller('products')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('inventory.create')
  async create(@Body() createProductDto: any, @Request() req) {
    const companyId =
      req.user.companyId ||
      (req.user.role === 'ADMIN' ? createProductDto.companyId : null);
    if (!companyId)
      throw new ForbiddenException(
        'Se requiere ID de empresa para crear un producto',
      );

    try {
      return await this.productsService.create(createProductDto, companyId);
    } catch (error) {
      console.error('❌ Error creando producto:', error);
      throw new BadRequestException(
        `Error al crear producto: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }

  @Get()
  @Permissions(
    'inventory.view',
    'inventory.create',
    'inventory.edit',
    'inventory.delete',
    'sales.view',
    'quotes.view',
    'sales-orders.view',
    'sales-invoices.view',
    'purchase_orders.view',
    'receptions.view',
    'bills.view',
  )
  findAll(@Request() req, @Query() query: PaginationDto = new PaginationDto()) {
    const user = req.user;
    return this.productsService.findAll(
      user.companyId,
      query || new PaginationDto(),
      user.role,
    );
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
