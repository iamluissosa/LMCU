import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('suppliers')
@UseGuards(AuthGuard('jwt')) // 🔒 Seguridad Activada
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  async create(@Request() req, @Body() data: any) {
    try {
        if (!req.user?.companyId) {
            throw new HttpException('El usuario no tiene una empresa asignada.', HttpStatus.BAD_REQUEST);
        }
        return await this.suppliersService.create(req.user.companyId, data);
    } catch (error) {
        console.error('Error creando proveedor:', error);
        if (error instanceof HttpException) throw error;
        throw new HttpException(error.message || 'Error interno al crear proveedor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async findAll(@Request() req) {
    try {
        if (!req.user?.companyId) {
             // Si no hay empresa, retornamos array vacío o error. Mejor error para debug.
             throw new HttpException('El usuario no tiene una empresa asignada.', HttpStatus.BAD_REQUEST);
        }
        return await this.suppliersService.findAll(req.user.companyId);
    } catch (error) {
        console.error('Error buscando proveedores:', error);
        if (error instanceof HttpException) throw error;
        throw new HttpException(error.message || 'Error interno al buscar proveedores', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.suppliersService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}