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
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get('debug/permissions')
  async debugPermissions() {
    return this.suppliersService.debugGetPermissions();
  }

  @Post('debug/fix-permissions')
  async debugFixPermissions() {
    return this.suppliersService.debugFixPermissions();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('suppliers.create')
  async create(@Request() req, @Body() data: CreateSupplierDto) {
    try {
      if (!req.user?.companyId) {
        throw new HttpException(
          'El usuario no tiene una empresa asignada.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.suppliersService.create(req.user.companyId, data);
    } catch (error) {
      console.error('Error creando proveedor:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Error interno al crear proveedor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('suppliers.view')
  async findAll(@Request() req, @Query() query: PaginationDto = new PaginationDto()) {
    try {
      if (!req.user?.companyId) {
        throw new HttpException(
          'El usuario no tiene una empresa asignada.',
          HttpStatus.BAD_REQUEST,
        );
      }
      const { page = 1, limit = 20 } = query || new PaginationDto();
      return await this.suppliersService.findAll(req.user.companyId, page, limit);
    } catch (error) {
      console.error('Error buscando proveedores:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Error interno al buscar proveedores',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('suppliers.view')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('suppliers.edit')
  update(@Param('id') id: string, @Body() data: UpdateSupplierDto) {
    return this.suppliersService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('suppliers.delete')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
